// be/src/service/category-service.ts
// Service layer: logika bisnis untuk Category

import type { CategoryRepo, NewCategoryInput, UpdateCategoryInput } from "../repository/category-repo"
import { ConflictError, NotFoundError, ValidationError } from "./errors"

export const makeCategoryService = (repo: CategoryRepo) => ({
  async listCategories() {
    return repo.list()
  },

  async getCategory(id: string) {
    const cat = await repo.findById(id)
    if (!cat) throw new NotFoundError("Kategori", id)
    return cat
  },

  async createCategory(input: NewCategoryInput) {
    if (!input.name?.trim()) throw new ValidationError(["Nama kategori tidak boleh kosong"])

    const existing = await repo.findByName(input.name.trim())
    if (existing) throw new ConflictError(`Kategori '${input.name}' sudah ada`)

    return repo.create({ ...input, name: input.name.trim() })
  },

  async updateCategory(id: string, input: UpdateCategoryInput) {
    const cat = await repo.findById(id)
    if (!cat) throw new NotFoundError("Kategori", id)

    if (input.name) {
      const existing = await repo.findByName(input.name.trim())
      if (existing && existing.id !== id)
        throw new ConflictError(`Nama kategori '${input.name}' sudah digunakan`)
    }

    return repo.update(id, input)
  },

  async deleteCategory(id: string) {
    const cat = await repo.findById(id)
    if (!cat) throw new NotFoundError("Kategori", id)
    await repo.delete(id)
    return { message: "Kategori berhasil dihapus" }
  },
})

export type CategoryService = ReturnType<typeof makeCategoryService>
