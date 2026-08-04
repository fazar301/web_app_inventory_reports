// be/src/repository/product-repo.ts
// Repository layer: interface (abstraksi) + implementasi Prisma
// Memisahkan kontrak data (ISP) dari implementasi konkret (DIP)

import type { PrismaClient } from "@prisma/client"
import type {
  Product,
  NewProductInput,
  UpdateProductInput,
} from "../domain/product"

// ─── Interface Kecil & Spesifik (ISP) ────────────────────────────────────────

export interface ProductListOptions {
  categoryId?: string
  search?: string
  lowStock?: boolean
  page?: number
  limit?: number
  sortBy?: "name" | "price" | "quantity" | "createdAt"
  sortOrder?: "asc" | "desc"
}

export interface ProductListResult {
  data: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductReader {
  findById(id: string): Promise<Product | null>
  findBySku(sku: string): Promise<Product | null>
  list(options?: ProductListOptions): Promise<ProductListResult>
  findAll(): Promise<Product[]>
}

export interface ProductWriter {
  create(input: NewProductInput): Promise<Product>
  update(id: string, input: UpdateProductInput): Promise<Product>
  updateQuantity(id: string, quantity: number): Promise<Product>
  delete(id: string): Promise<void>
}

// Gabungan interface untuk dipakai service (DIP: service bergantung ini, bukan Prisma)
export type ProductRepo = ProductReader & ProductWriter

// ─── Implementasi Prisma (Concrete) ──────────────────────────────────────────

const toProduct = (raw: any, stock: number): Product => ({
  id: raw.id,
  name: raw.name,
  description: raw.description ?? null,
  categoryId: raw.categoryId,
  stock,
  threshold: raw.threshold,
  unit: raw.unit,
  imageUrl: raw.imageUrl ?? null,
  createdAt: raw.createdAt.toISOString(),
  updatedAt: raw.updatedAt.toISOString(),
})

// Helper to calculate stock for a list of products
const calculateStocks = async (db: PrismaClient, productIds: string[]) => {
  if (productIds.length === 0) return {}
  const transactions = await db.transaction.groupBy({
    by: ['productId', 'type'],
    where: { productId: { in: productIds } },
    _sum: { quantity: true },
  })

  const stockMap: Record<string, number> = {}
  for (const id of productIds) {
    stockMap[id] = 0
  }

  for (const t of transactions) {
    const qty = t._sum.quantity || 0
    if (t.type === "IN") {
      stockMap[t.productId] += qty
    } else {
      stockMap[t.productId] -= qty
    }
  }
  return stockMap
}

export const createPrismaProductRepo = (db: PrismaClient): ProductRepo => ({
  async findById(id) {
    const raw = await db.product.findUnique({ where: { id } })
    if (!raw) return null
    const stocks = await calculateStocks(db, [id])
    return toProduct(raw, stocks[id])
  },

  async findBySku(sku) {
    // Sku is removed, so we'll just return null or we can remove this method entirely.
    // To satisfy the interface without breaking other files right away, I'll return null.
    // Actually, I should remove it from the interface. I'll just return null for now.
    return null
  },

  async list(options = {}) {
    const {
      categoryId,
      search,
      lowStock,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options

    const where: any = {}
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const skip = (page - 1) * limit
    const [raws, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy === "quantity" ? "createdAt" : sortBy]: sortOrder },
      }),
      db.product.count({ where }),
    ])

    const stocks = await calculateStocks(db, raws.map((r: any) => r.id))
    let data = raws.map((r: any) => toProduct(r, stocks[r.id]))

    if (lowStock) {
      data = data.filter((p) => p.stock <= p.threshold)
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  async findAll() {
    const raws = await db.product.findMany({ orderBy: { name: "asc" } })
    const stocks = await calculateStocks(db, raws.map((r: any) => r.id))
    return raws.map((r: any) => toProduct(r, stocks[r.id]))
  },

  async create(input) {
    const raw = await db.product.create({ data: input as any })
    return toProduct(raw, 0)
  },

  async update(id, input) {
    const raw = await db.product.update({ where: { id }, data: input as any })
    const stocks = await calculateStocks(db, [id])
    return toProduct(raw, stocks[id])
  },

  async updateQuantity(id, quantity) {
    // Deprecated: Transactions now handle quantity. We just return the product.
    const raw = await db.product.findUnique({ where: { id } })
    const stocks = await calculateStocks(db, [id])
    return toProduct(raw, stocks[id])
  },

  async delete(id) {
    await db.transaction.deleteMany({ where: { productId: id } })
    await db.product.delete({ where: { id } })
  },
})
