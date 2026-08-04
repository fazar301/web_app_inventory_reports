// be/src/service/product-service.ts
// Service layer: logika bisnis (orkestrasi) untuk Product
// DIP: bergantung pada interface ProductRepo, bukan Prisma langsung

import type { ProductRepo, ProductListOptions } from "../repository/product-repo"
import type { CategoryRepo } from "../repository/category-repo"
import type { TransactionRepo } from "../repository/transaction-repo"
import type { NewProductInput, UpdateProductInput, Product } from "../domain/product"
import {
  validateNewProduct,
  normalizeNewProduct,
} from "../domain/product"
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "./errors"

// ─── Factory (DIP: dependency disuntik dari luar) ─────────────────────────────

export const makeProductService = (
  productRepo: ProductRepo,
  categoryRepo: CategoryRepo,
  transactionRepo: TransactionRepo
) => ({
  /**
   * Ambil daftar produk dengan filter & pagination
   */
  async listProducts(options?: ProductListOptions) {
    const result = await productRepo.list(options)
    
    // Fetch stock for these products
    const productIds = result.data.map(p => p.id)
    const stockMap = await transactionRepo.getStockMap(productIds)
    
    result.data = result.data.map(p => ({
      ...p,
      stock: stockMap[p.id] || 0
    }))
    
    // Filter by low stock if needed (since it's dynamic, we might need to filter after fetching, but limit/page might be skewed)
    // For MVP, if lowStock filter is needed we do it here (though not supported in options currently)
    
    return result
  },

  /**
   * Ambil detail produk berdasarkan ID
   */
  async getProduct(id: string) {
    const product = await productRepo.findById(id)
    if (!product) throw new NotFoundError("Produk", id)
    
    product.stock = await transactionRepo.getCurrentStock(id)
    return product
  },

  /**
   * Buat produk baru
   * Pipeline: validasi (murni) → cek duplikat → cek kategori → simpan
   */
  async createProduct(input: NewProductInput) {
    // 1. Normalisasi & validasi (pure)
    const normalized = normalizeNewProduct(input)
    const errors = validateNewProduct(normalized)
    if (errors.length > 0) throw new ValidationError(errors)

    // 2. (SKU sudah dihapus, tidak perlu cek duplikat)

    // 3. Cek kategori valid (efek samping di tepi)
    const category = await categoryRepo.findById(normalized.categoryId)
    if (!category) throw new NotFoundError("Kategori", normalized.categoryId)

    // 4. Simpan (efek samping di tepi)
    return productRepo.create(normalized)
  },

  /**
   * Update produk
   */
  async updateProduct(id: string, input: UpdateProductInput) {
    const product = await productRepo.findById(id)
    if (!product) throw new NotFoundError("Produk", id)

    // Validasi kategori jika diubah
    if (input.categoryId) {
      const category = await categoryRepo.findById(input.categoryId)
      if (!category) throw new NotFoundError("Kategori", input.categoryId)
    }


    return productRepo.update(id, input)
  },

  /**
   * Hapus produk
   */
  async deleteProduct(id: string) {
    const product = await productRepo.findById(id)
    if (!product) throw new NotFoundError("Produk", id)
    await productRepo.delete(id)
    return { message: "Produk berhasil dihapus" }
  },
})

export type ProductService = ReturnType<typeof makeProductService>
