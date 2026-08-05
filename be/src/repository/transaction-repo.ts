// be/src/repository/transaction-repo.ts

import type { PrismaClient } from "@prisma/client"
import type { Transaction, NewTransactionInput, TransactionType } from "../domain/transaction"

export interface TransactionListOptions {
  productId?: string
  type?: TransactionType
  startDate?: Date
  endDate?: Date
  search?: string
  page?: number
  limit?: number
}

export interface TransactionWithProduct extends Transaction {
  productName: string
}

export interface TransactionListResult {
  data: TransactionWithProduct[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TransactionRepo {
  create(input: NewTransactionInput): Promise<Transaction>
  list(options?: TransactionListOptions): Promise<TransactionListResult>
  listByProduct(productId: string): Promise<TransactionWithProduct[]>
  listWithProduct(options?: TransactionListOptions): Promise<TransactionWithProduct[]>
  getCurrentStock(productId: string): Promise<number>
  getStockMap(productIds?: string[], startDate?: Date, endDate?: Date): Promise<Record<string, number>>
  getLastTransactionDateMap(productIds?: string[], startDate?: Date, endDate?: Date): Promise<Record<string, Date | null>>
  findById(id: string): Promise<TransactionWithProduct | null>
  update(id: string, input: Partial<NewTransactionInput>): Promise<TransactionWithProduct>
  delete(id: string): Promise<void>
}

const toTransaction = (raw: any): Transaction => ({
  id: raw.id,
  productId: raw.productId,
  type: raw.type,
  quantity: raw.quantity,
  amount: raw.amount,
  transactionDate: raw.transactionDate.toISOString(),
  notes: raw.notes ?? null,
  createdBy: raw.createdBy ?? null,
  createdAt: raw.createdAt.toISOString(),
})

const toTransactionWithProduct = (raw: any): TransactionWithProduct => ({
  ...toTransaction(raw),
  productName: raw.product?.name ?? "",
  createdBy: raw.user?.name ?? raw.createdBy ?? null,
})

const populateUsers = async (db: PrismaClient, raws: any[]) => {
  const userIds = [...new Set(raws.map(r => r.createdBy).filter(Boolean))] as string[]
  if (userIds.length === 0) return raws

  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true }
  })
  
  const userMap = new Map(users.map(u => [u.id, u.name]))
  
  return raws.map(r => {
    if (!r.createdBy) return r
    const userName = userMap.get(r.createdBy)
    return {
      ...r,
      user: { name: userName || r.createdBy }
    }
  })
}

export const createPrismaTransactionRepo = (db: PrismaClient): TransactionRepo => ({
  async create(input) {
    const raw = await db.transaction.create({ data: input as any })
    return toTransaction(raw)
  },

  async list(options = {}) {
    const { productId, type, startDate, endDate, search, page = 1, limit = 10 } = options

    const where: any = {}
    if (productId) where.productId = productId
    if (type) where.type = type
    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) where.transactionDate.gte = startDate
      if (endDate) where.transactionDate.lte = endDate
    }
    
    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { notes: { contains: search, mode: "insensitive" } },
      ]
    }

    const skip = (page - 1) * limit
    const [raws, total] = await Promise.all([
      db.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        include: { product: { select: { name: true } } },
      }),
      db.transaction.count({ where }),
    ])

    const populated = await populateUsers(db, raws)

    return {
      data: populated.map(toTransactionWithProduct),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  async listByProduct(productId) {
    const raws = await db.transaction.findMany({
      where: { productId },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include: { product: { select: { name: true } } },
    })
    const populated = await populateUsers(db, raws)
    return populated.map(toTransactionWithProduct)
  },

  async listWithProduct(options = {}) {
    const { startDate, endDate } = options
    const where: any = {}
    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) where.transactionDate.gte = startDate
      if (endDate) where.transactionDate.lte = endDate
    }

    const raws = await db.transaction.findMany({
      where,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include: { product: { select: { name: true } } },
    })
    const populated = await populateUsers(db, raws)
    return populated.map(toTransactionWithProduct)
  },

  async getCurrentStock(productId) {
    const transactions = await db.transaction.groupBy({
      by: ['type'],
      where: { productId },
      _sum: { quantity: true },
    })

    let stock = 0
    for (const t of transactions) {
      if (t.type === "IN") stock += (t._sum.quantity || 0)
      if (t.type === "OUT") stock -= (t._sum.quantity || 0)
    }
    return stock
  },

  async getStockMap(productIds, startDate, endDate) {
    const where: any = {}
    if (productIds) where.productId = { in: productIds }
    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) where.transactionDate.gte = startDate
      if (endDate) where.transactionDate.lte = endDate
    }

    const transactions = await db.transaction.groupBy({
      by: ['productId', 'type'],
      where,
      _sum: { quantity: true },
    })

    const stockMap: Record<string, number> = {}
    if (productIds) {
      for (const id of productIds) stockMap[id] = 0
    }

    for (const t of transactions) {
      const qty = t._sum.quantity || 0
      if (!stockMap[t.productId]) stockMap[t.productId] = 0
      if (t.type === "IN") stockMap[t.productId] += qty
      if (t.type === "OUT") stockMap[t.productId] -= qty
    }
    return stockMap
  },

  async getLastTransactionDateMap(productIds, startDate, endDate) {
    const where: any = {}
    if (productIds) where.productId = { in: productIds }
    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) where.transactionDate.gte = startDate
      if (endDate) where.transactionDate.lte = endDate
    }

    const transactions = await db.transaction.groupBy({
      by: ['productId'],
      where,
      _max: { transactionDate: true },
    })

    const dateMap: Record<string, Date | null> = {}
    for (const t of transactions) {
      dateMap[t.productId] = t._max.transactionDate
    }
    return dateMap
  },

  async findById(id) {
    const raw = await db.transaction.findUnique({
      where: { id },
      include: { product: { select: { name: true } } },
    })
    return raw ? toTransactionWithProduct(raw) : null
  },

  async update(id, input) {
    const raw = await db.transaction.update({
      where: { id },
      data: input as any,
      include: { product: { select: { name: true } } },
    })
    return toTransactionWithProduct(raw)
  },

  async delete(id) {
    await db.transaction.delete({ where: { id } })
  },
})
