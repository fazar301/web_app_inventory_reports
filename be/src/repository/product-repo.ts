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
  page?: number
  limit?: number
  sortBy?: "name" | "createdAt"
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
  list(options?: ProductListOptions): Promise<ProductListResult>
  findAll(): Promise<Product[]>
}

export interface ProductWriter {
  create(input: NewProductInput): Promise<Product>
  update(id: string, input: UpdateProductInput): Promise<Product>
  delete(id: string): Promise<void>
}

export type ProductRepo = ProductReader & ProductWriter

// ─── Implementasi Prisma (Concrete) ──────────────────────────────────────────

const toProduct = (raw: any): Product => ({
  id: raw.id,
  name: raw.name,
  description: raw.description ?? null,
  categoryId: raw.categoryId,
  categoryName: raw.category?.name,
  threshold: raw.threshold,
  unit: raw.unit,
  imageUrl: raw.imageUrl ?? null,
  createdAt: raw.createdAt.toISOString(),
  updatedAt: raw.updatedAt.toISOString(),
})

export const createPrismaProductRepo = (db: PrismaClient): ProductRepo => ({
  async findById(id) {
    const raw = await db.product.findUnique({
      where: { id },
      include: { category: true }
    })
    if (!raw) return null
    return toProduct(raw)
  },

  async list(options = {}) {
    const {
      categoryId,
      search,
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
        orderBy: { [sortBy]: sortOrder },
        include: { category: true }
      }),
      db.product.count({ where }),
    ])

    return {
      data: raws.map(toProduct),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  async findAll() {
    const raws = await db.product.findMany({
      orderBy: { name: "asc" },
      include: { category: true }
    })
    return raws.map(toProduct)
  },

  async create(input) {
    const raw = await db.product.create({
      data: input as any,
      include: { category: true }
    })
    return toProduct(raw)
  },

  async update(id, input) {
    const raw = await db.product.update({
      where: { id },
      data: input as any,
      include: { category: true }
    })
    return toProduct(raw)
  },

  async delete(id) {
    await db.transaction.deleteMany({ where: { productId: id } })
    await db.product.delete({ where: { id } })
  },
})
