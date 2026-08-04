// be/src/service/transaction-service.ts

import type { ProductRepo } from "../repository/product-repo"
import type {
  TransactionRepo,
  TransactionListOptions,
} from "../repository/transaction-repo"
import type { NewTransactionInput, UpdateTransactionInput } from "../domain/transaction"
import { validateNewTransaction } from "../domain/transaction"
import { ValidationError, NotFoundError } from "./errors"

export const makeTransactionService = (
  productRepo: ProductRepo,
  transactionRepo: TransactionRepo
) => ({
  async recordTransaction(input: NewTransactionInput) {
    // 1. Cek produk ada
    const product = await productRepo.findById(input.productId)
    if (!product) throw new NotFoundError("Produk", input.productId)

    // 2. Validasi input
    const errors = validateNewTransaction(input)
    if (errors.length > 0) throw new ValidationError(errors)

    // 3. Cek stok (mencegah stok minus untuk OUT)
    const currentStock = await transactionRepo.getCurrentStock(input.productId)
    if (input.type === "OUT" && currentStock < input.quantity) {
      throw new ValidationError([
        `Stok tidak mencukupi (Sisa: ${currentStock}, Diminta: ${input.quantity})`,
      ])
    }

    // 4. Simpan transaksi
    const transaction = await transactionRepo.create(input)

    return {
      transaction,
      product,
    }
  },

  async listTransactions(options?: TransactionListOptions) {
    return transactionRepo.list(options)
  },

  async getProductTransactions(productId: string) {
    const product = await productRepo.findById(productId)
    if (!product) throw new NotFoundError("Produk", productId)
    return transactionRepo.listByProduct(productId)
  },

  async updateTransaction(id: string, input: UpdateTransactionInput) {
    const transaction = await transactionRepo.findById(id)
    if (!transaction) throw new NotFoundError("Transaksi", id)
    
    // Hitung perubahan stok
    const currentStock = await transactionRepo.getCurrentStock(transaction.productId)
    let simulatedStock = currentStock
    
    // 1. Batalkan efek transaksi lama
    if (transaction.type === "IN") simulatedStock -= transaction.quantity
    if (transaction.type === "OUT") simulatedStock += transaction.quantity
    
    // 2. Aplikasikan efek transaksi baru
    const newType = input.type ?? transaction.type
    const newQty = input.quantity ?? transaction.quantity
    
    if (newType === "IN") simulatedStock += newQty
    if (newType === "OUT") simulatedStock -= newQty
    
    if (simulatedStock < 0) {
      throw new ValidationError([
        `Update ini akan menyebabkan stok menjadi minus (${simulatedStock}). Perubahan dibatalkan.`
      ])
    }

    return transactionRepo.update(id, input)
  },

  async deleteTransaction(id: string) {
    const transaction = await transactionRepo.findById(id)
    if (!transaction) throw new NotFoundError("Transaksi", id)
    
    if (transaction.type === "IN") {
      const currentStock = await transactionRepo.getCurrentStock(transaction.productId)
      if (currentStock - transaction.quantity < 0) {
        throw new ValidationError([
          `Menghapus transaksi masuk ini akan menyebabkan stok menjadi minus (${currentStock - transaction.quantity}). Hapus transaksi keluar yang berkaitan terlebih dahulu.`
        ])
      }
    }
    
    await transactionRepo.delete(id)
    return { message: "Transaksi berhasil dihapus" }
  },
})

export type TransactionService = ReturnType<typeof makeTransactionService>
