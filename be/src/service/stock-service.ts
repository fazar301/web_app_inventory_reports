// be/src/service/stock-service.ts
// Service layer: logika bisnis untuk Stock Movement
// DIP: bergantung pada interface ProductRepo & StockMovementRepo

import type { ProductRepo } from "../repository/product-repo"
import type {
  StockMovementRepo,
  StockMovementListOptions,
} from "../repository/stock-movement-repo"
import type { NewStockMovementInput } from "../domain/stock"
import {
  validateStockMovement,
  normalizeMovementInput,
  applyMovement,
} from "../domain/stock"
import { ValidationError, NotFoundError } from "./errors"

// ─── Factory ──────────────────────────────────────────────────────────────────

export const makeStockService = (
  productRepo: ProductRepo,
  movementRepo: StockMovementRepo
) => ({
  /**
   * Catat pergerakan stok (IN atau OUT)
   * Pipeline: cek produk → validasi stok → simpan movement → update quantity
   */
  async recordMovement(input: NewStockMovementInput) {
    // 1. Cek produk ada
    const product = await productRepo.findById(input.productId)
    if (!product) throw new NotFoundError("Produk", input.productId)

    // 2. Normalisasi input (immutable)
    const normalized = normalizeMovementInput(input)

    // 3. Validasi (pure function — cek stok cukup untuk OUT)
    const errors = validateStockMovement(normalized, product.quantity)
    if (errors.length > 0) throw new ValidationError(errors)

    // 4. Hitung quantity baru (pure function)
    const newQuantity = applyMovement(
      product.quantity,
      normalized.quantity,
      normalized.type
    )

    // 5. Simpan movement + update stok (efek samping di tepi)
    const [movement] = await Promise.all([
      movementRepo.create(normalized),
      productRepo.updateQuantity(input.productId, newQuantity),
    ])

    return {
      movement,
      product: { ...product, quantity: newQuantity },
    }
  },

  /**
   * Daftar pergerakan stok dengan filter
   */
  async listMovements(options?: StockMovementListOptions) {
    return movementRepo.list(options)
  },

  /**
   * Daftar pergerakan untuk satu produk
   */
  async getProductMovements(productId: string) {
    const product = await productRepo.findById(productId)
    if (!product) throw new NotFoundError("Produk", productId)
    return movementRepo.listByProduct(productId)
  },
})

export type StockService = ReturnType<typeof makeStockService>
