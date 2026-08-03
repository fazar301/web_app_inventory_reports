// be/src/repository/category-repo.ts
// Repository layer: interface + implementasi Prisma untuk Category

import type { PrismaClient } from "@prisma/client"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Category = {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count?: { products: number }
}

export type NewCategoryInput = {
  name: string
  description?: string
}

export type UpdateCategoryInput = Partial<NewCategoryInput>

// ─── Interface (ISP) ──────────────────────────────────────────────────────────

export interface CategoryRepo {
  findById(id: string): Promise<Category | null>
  findByName(name: string): Promise<Category | null>
  list(): Promise<Category[]>
  create(input: NewCategoryInput): Promise<Category>
  update(id: string, input: UpdateCategoryInput): Promise<Category>
  delete(id: string): Promise<void>
}

// ─── Implementasi Prisma ──────────────────────────────────────────────────────

const toCategory = (raw: any): Category => ({
  id: raw.id,
  name: raw.name,
  description: raw.description ?? null,
  createdAt: raw.createdAt.toISOString(),
  updatedAt: raw.updatedAt.toISOString(),
  _count: raw._count,
})

export const createPrismaCategoryRepo = (db: PrismaClient): CategoryRepo => ({
  async findById(id) {
    const raw = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    return raw ? toCategory(raw) : null
  },

  async findByName(name) {
    const raw = await db.category.findUnique({ where: { name } })
    return raw ? toCategory(raw) : null
  },

  async list() {
    const raws = await db.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    })
    return raws.map(toCategory)
  },

  async create(input) {
    const raw = await db.category.create({ data: input })
    return toCategory(raw)
  },

  async update(id, input) {
    const raw = await db.category.update({ where: { id }, data: input })
    return toCategory(raw)
  },

  async delete(id) {
    await db.category.delete({ where: { id } })
  },
})
