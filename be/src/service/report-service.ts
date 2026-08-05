// be/src/service/report-service.ts

import type { ProductRepo } from "../repository/product-repo"
import type { TransactionRepo } from "../repository/transaction-repo"
import type { CategoryRepo } from "../repository/category-repo"
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
  transactionRepo: TransactionRepo,
  categoryRepo: CategoryRepo
) => ({
  async getInventorySummary() {
    const products = await productRepo.findAll()
    const categories = await categoryRepo.list()
    const stockMap = await transactionRepo.getStockMap(products.map(p => p.id))
    return calculateInventorySummary(products, stockMap, categories.length)
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
    const { startDate, endDate, sortOrder = "desc", ...productOptions } = options
    const productsResult = await productRepo.list(productOptions)

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const productIds = productsResult.data.map((p) => p.id)
    
    const [stockMap, lastDateMap] = await Promise.all([
      transactionRepo.getStockMap(productIds, undefined, undefined), // selalu ambil stok total tanpa terpengaruh filter tanggal
      transactionRepo.getLastTransactionDateMap(productIds, start, end),
    ])

    let reportData = productsResult.data.map((p) => ({
      productId: p.id,
      productName: p.name,
      categoryName: p.categoryName || "-",
      stock: stockMap[p.id] || 0,
      unit: p.unit,
      lastUpdated: lastDateMap[p.id] ?? p.updatedAt,
      threshold: p.threshold,
    }))

    // Jika filter tanggal diaktifkan, hanya tampilkan produk yang bergerak (punya transaksi) di rentang tersebut
    if (start || end) {
      reportData = reportData.filter((p) => lastDateMap[p.productId])
    }

    // Urutkan berdasarkan lastUpdated
    reportData.sort((a, b) => {
      const dateA = new Date(a.lastUpdated).getTime()
      const dateB = new Date(b.lastUpdated).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    })

    return {
      ...productsResult,
      data: reportData,
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
    
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    return transactionRepo.list({
      ...rest,
      startDate: start,
      endDate: end,
    })
  },
})

export type ReportService = ReturnType<typeof makeReportService>
