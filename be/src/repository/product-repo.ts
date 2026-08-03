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

const toProduct = (raw: any): Product => ({
  id: raw.id,
  sku: raw.sku,
  name: raw.name,
  description: raw.description ?? null,
  categoryId: raw.categoryId,
  price: raw.price,
  quantity: raw.quantity,
  threshold: raw.threshold,
  unit: raw.unit,
  imageUrl: raw.imageUrl ?? null,
  createdAt: raw.createdAt.toISOString(),
  updatedAt: raw.updatedAt.toISOString(),
})

/**
 * Factory function — Prisma disuntik dari luar (DIP)
 * Service tidak perlu tahu bahwa ini Prisma/MongoDB
 */
export const createPrismaProductRepo = (db: PrismaClient): ProductRepo => ({
  async findById(id) {
    const raw = await db.product.findUnique({ where: { id } })
    return raw ? toProduct(raw) : null
  },

  async findBySku(sku) {
    const raw = await db.product.findUnique({ where: { sku } })
    return raw ? toProduct(raw) : null
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
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }
    // Low stock: quantity <= threshold
    // MongoDB Prisma doesn't support field comparisons directly, we filter post-query for lowStock

    const skip = (page - 1) * limit
    const [raws, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      db.product.count({ where }),
    ])

    let data = raws.map(toProduct)
    if (lowStock) {
      data = data.filter((p) => p.quantity <= p.threshold)
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
    return raws.map(toProduct)
  },

  async create(input) {
    const raw = await db.product.create({ data: input as any })
    return toProduct(raw)
  },

  async update(id, input) {
    const raw = await db.product.update({ where: { id }, data: input as any })
    return toProduct(raw)
  },

  async updateQuantity(id, quantity) {
    const raw = await db.product.update({ where: { id }, data: { quantity } })
    return toProduct(raw)
  },

  async delete(id) {
    await db.product.delete({ where: { id } })
  },
})
