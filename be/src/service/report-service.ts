// be/src/service/report-service.ts

import type { ProductRepo } from "../repository/product-repo"
import type { TransactionRepo } from "../repository/transaction-repo"
import {
  calculateInventorySummary,
  aggregateTransactionsByProduct,
  getTopOutProducts,
  filterLowStockProducts,
} from "../domain/report"

export interface ReportDateRange {
  startDate?: string // ISO string
  endDate?: string   // ISO string
}

export const makeReportService = (
  productRepo: ProductRepo,
  transactionRepo: TransactionRepo
) => ({
  async getInventorySummary() {
    const products = await productRepo.findAll()
    return calculateInventorySummary(products)
  },

  async getTransactionReport(range: ReportDateRange = {}) {
    const startDate = range.startDate ? new Date(range.startDate) : undefined
    const endDate = range.endDate ? new Date(range.endDate) : undefined

    const transactions = await transactionRepo.listWithProduct({ startDate, endDate })
    return aggregateTransactionsByProduct(transactions)
  },

  async getLowStockProducts() {
    const products = await productRepo.findAll()
    return filterLowStockProducts(products)
  },

  async getTopProducts(limit: number = 10, range: ReportDateRange = {}) {
    const startDate = range.startDate ? new Date(range.startDate) : undefined
    const endDate = range.endDate ? new Date(range.endDate) : undefined

    const [transactions, products] = await Promise.all([
      transactionRepo.listWithProduct({ startDate, endDate }),
      productRepo.findAll(),
    ])

    const reports = aggregateTransactionsByProduct(transactions)
    return getTopOutProducts(reports, products, limit)
  },

  async getDetailedTransactions(
    options: ReportDateRange & {
      productId?: string
      type?: "IN" | "OUT"
      page?: number
      limit?: number
    } = {}
  ) {
    const { startDate, endDate, ...rest } = options
    return transactionRepo.list({
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  },
})

export type ReportService = ReturnType<typeof makeReportService>
