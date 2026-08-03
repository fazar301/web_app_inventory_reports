// be/src/repository/stock-movement-repo.ts
// Repository layer: interface + implementasi Prisma untuk StockMovement

import type { PrismaClient } from "@prisma/client"
import type { StockMovement, NewStockMovementInput } from "../domain/stock"

// ─── Query Options ─────────────────────────────────────────────────────────────

export interface StockMovementListOptions {
  productId?: string
  type?: "IN" | "OUT"
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export interface StockMovementWithProduct extends StockMovement {
  productName: string
  sku: string
}

export interface StockMovementListResult {
  data: StockMovementWithProduct[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Interface (ISP) ──────────────────────────────────────────────────────────

export interface StockMovementRepo {
  create(input: NewStockMovementInput): Promise<StockMovement>
  list(options?: StockMovementListOptions): Promise<StockMovementListResult>
  listByProduct(
    productId: string
  ): Promise<StockMovementWithProduct[]>
  listWithProduct(
    options?: StockMovementListOptions
  ): Promise<StockMovementWithProduct[]>
}

// ─── Implementasi Prisma ──────────────────────────────────────────────────────

const toMovement = (raw: any): StockMovement => ({
  id: raw.id,
  productId: raw.productId,
  type: raw.type,
  quantity: raw.quantity,
  note: raw.note ?? null,
  reference: raw.reference ?? null,
  createdBy: raw.createdBy ?? null,
  createdAt: raw.createdAt.toISOString(),
})

const toMovementWithProduct = (raw: any): StockMovementWithProduct => ({
  ...toMovement(raw),
  productName: raw.product?.name ?? "",
  sku: raw.product?.sku ?? "",
})

export const createPrismaStockMovementRepo = (
  db: PrismaClient
): StockMovementRepo => ({
  async create(input) {
    const raw = await db.stockMovement.create({ data: input as any })
    return toMovement(raw)
  },

  async list(options = {}) {
    const {
      productId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options

    const where: any = {}
    if (productId) where.productId = productId
    if (type) where.type = type
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const skip = (page - 1) * limit
    const [raws, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true, sku: true } } },
      }),
      db.stockMovement.count({ where }),
    ])

    return {
      data: raws.map(toMovementWithProduct),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  async listByProduct(productId) {
    const raws = await db.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, sku: true } } },
    })
    return raws.map(toMovementWithProduct)
  },

  async listWithProduct(options = {}) {
    const { startDate, endDate } = options
    const where: any = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const raws = await db.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, sku: true } } },
    })
    return raws.map(toMovementWithProduct)
  },
})
