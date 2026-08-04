// be/src/service/transaction-service.ts

import type { ProductRepo } from "../repository/product-repo"
import type {
  TransactionRepo,
  TransactionListOptions,
} from "../repository/transaction-repo"
import type { NewTransactionInput } from "../domain/transaction"
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
    if (input.type === "OUT" && product.stock < input.quantity) {
      throw new ValidationError([
        `Stok tidak mencukupi (Sisa: ${product.stock}, Diminta: ${input.quantity})`,
      ])
    }

    // 4. Simpan transaksi
    const transaction = await transactionRepo.create(input)

    // 5. Update stok produk secara dinamis untuk response
    const newStock = input.type === "IN" 
      ? product.stock + input.quantity 
      : product.stock - input.quantity

    return {
      transaction,
      product: { ...product, stock: newStock },
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
})

export type TransactionService = ReturnType<typeof makeTransactionService>
