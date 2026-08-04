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
    const stockMap = await transactionRepo.getStockMap(products.map(p => p.id))
    return calculateInventorySummary(products, stockMap)
  },

  async getTransactionReport(range: ReportDateRange = {}) {
    const startDate = range.startDate ? new Date(range.startDate) : undefined
    const endDate = range.endDate ? new Date(range.endDate) : undefined

    const transactions = await transactionRepo.listWithProduct({ startDate, endDate })
    return aggregateTransactionsByProduct(transactions)
  },

  async getLowStockProducts() {
    const products = await productRepo.findAll()
    const stockMap = await transactionRepo.getStockMap(products.map(p => p.id))
    return filterLowStockProducts(products, stockMap)
  },

  async getTopProducts(limit: number = 10, range: ReportDateRange = {}) {
    const startDate = range.startDate ? new Date(range.startDate) : undefined
    const endDate = range.endDate ? new Date(range.endDate) : undefined

    const [transactions, products] = await Promise.all([
      transactionRepo.listWithProduct({ startDate, endDate }),
      productRepo.findAll(),
    ])

    const stockMap = await transactionRepo.getStockMap(products.map(p => p.id))
    const reports = aggregateTransactionsByProduct(transactions)
    return getTopOutProducts(reports, products, stockMap, limit)
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
