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

  async getInventoryReport(
    options: ReportDateRange & {
      categoryId?: string
      search?: string
      page?: number
      limit?: number
      sortBy?: "name" | "createdAt"
      sortOrder?: "asc" | "desc"
    } = {}
  ) {
    const { startDate, endDate, ...productOptions } = options
    const productsResult = await productRepo.list(productOptions)

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const stockMap = await transactionRepo.getStockMap(
      productsResult.data.map((p) => p.id),
      start,
      end
    )

    return {
      ...productsResult,
      data: productsResult.data.map((p) => ({
        productId: p.id,
        productName: p.name,
        categoryName: p.categoryName || "-",
        stock: stockMap[p.id] || 0,
        unit: p.unit,
        lastUpdated: p.updatedAt,
        threshold: p.threshold,
      })),
    }
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
