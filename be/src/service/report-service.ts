// be/src/service/report-service.ts
// Service layer: logika untuk membuat laporan
// Orkestrasi: ambil data dari repo → kalkulasi (pure domain functions)

import type { ProductRepo } from "../repository/product-repo"
import type { StockMovementRepo } from "../repository/stock-movement-repo"
import {
  calculateInventorySummary,
  aggregateMovementsByProduct,
  getTopOutProducts,
  filterLowStockProducts,
} from "../domain/report"

export interface ReportDateRange {
  startDate?: string // ISO string
  endDate?: string   // ISO string
}

export const makeReportService = (
  productRepo: ProductRepo,
  movementRepo: StockMovementRepo
) => ({
  /**
   * Ringkasan inventori: total produk, item, nilai, low stock, out of stock
   */
  async getInventorySummary() {
    const products = await productRepo.findAll()
    return calculateInventorySummary(products) // pure function
  },

  /**
   * Laporan pergerakan stok (aggregasi per produk) dalam rentang tanggal
   */
  async getStockMovementReport(range: ReportDateRange = {}) {
    const startDate = range.startDate ? new Date(range.startDate) : undefined
    const endDate = range.endDate ? new Date(range.endDate) : undefined

    const movements = await movementRepo.listWithProduct({ startDate, endDate })
    return aggregateMovementsByProduct(movements) // pure function
  },

  /**
   * Daftar produk dengan stok rendah (di bawah threshold)
   */
  async getLowStockProducts() {
    const products = await productRepo.findAll()
    return filterLowStockProducts(products) // pure function
  },

  /**
   * Top N produk paling sering keluar (terlaris)
   */
  async getTopProducts(limit: number = 10, range: ReportDateRange = {}) {
    const startDate = range.startDate ? new Date(range.startDate) : undefined
    const endDate = range.endDate ? new Date(range.endDate) : undefined

    const [movements, products] = await Promise.all([
      movementRepo.listWithProduct({ startDate, endDate }),
      productRepo.findAll(),
    ])

    const reports = aggregateMovementsByProduct(movements) // pure
    return getTopOutProducts(reports, products, limit)      // pure
  },

  /**
   * Detail pergerakan stok (raw list) dengan pagination
   */
  async getDetailedMovements(
    options: ReportDateRange & {
      productId?: string
      type?: "IN" | "OUT"
      page?: number
      limit?: number
    } = {}
  ) {
    const { startDate, endDate, ...rest } = options
    return movementRepo.list({
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  },
})

export type ReportService = ReturnType<typeof makeReportService>
