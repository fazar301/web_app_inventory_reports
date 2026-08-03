// be/src/domain/report.ts
// Domain layer: pure functions untuk kalkulasi laporan
// NO I/O — semua data sudah didapat dari repository sebelum masuk sini

import type { Product } from "./product"
import type { StockMovement } from "./stock"

// ─── Types ────────────────────────────────────────────────────────────────────

export type InventorySummary = {
  totalProducts: number
  totalItems: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}

export type StockMovementReport = {
  productId: string
  productName: string
  sku: string
  totalIn: number
  totalOut: number
  netChange: number
}

export type TopProduct = {
  productId: string
  productName: string
  sku: string
  totalOut: number
  currentStock: number
}

// ─── Pure Calculation Functions ────────────────────────────────────────────────

/**
 * Hitung ringkasan inventori dari daftar produk
 * Pure: tidak ada I/O, hanya transformasi data
 */
export const calculateInventorySummary = (
  products: Product[]
): InventorySummary => ({
  totalProducts: products.length,
  totalItems: products.reduce((sum, p) => sum + p.quantity, 0),
  totalValue: products.reduce((sum, p) => sum + p.price * p.quantity, 0),
  lowStockCount: products.filter(
    (p) => p.quantity > 0 && p.quantity <= p.threshold
  ).length,
  outOfStockCount: products.filter((p) => p.quantity === 0).length,
})

/**
 * Aggregasi pergerakan stok per produk
 * Pure: hanya transformasi array → map → array
 */
export const aggregateMovementsByProduct = (
  movements: (StockMovement & { productName: string; sku: string })[]
): StockMovementReport[] => {
  const map = new Map<string, StockMovementReport>()

  for (const m of movements) {
    const existing = map.get(m.productId)
    if (existing) {
      map.set(m.productId, {
        ...existing,
        totalIn: existing.totalIn + (m.type === "IN" ? m.quantity : 0),
        totalOut: existing.totalOut + (m.type === "OUT" ? m.quantity : 0),
        netChange:
          existing.netChange +
          (m.type === "IN" ? m.quantity : -m.quantity),
      })
    } else {
      map.set(m.productId, {
        productId: m.productId,
        productName: m.productName,
        sku: m.sku,
        totalIn: m.type === "IN" ? m.quantity : 0,
        totalOut: m.type === "OUT" ? m.quantity : 0,
        netChange: m.type === "IN" ? m.quantity : -m.quantity,
      })
    }
  }

  return Array.from(map.values())
}

/**
 * Ambil produk dengan stok paling sering keluar (top N)
 * Pure: sort + slice
 */
export const getTopOutProducts = (
  reports: StockMovementReport[],
  products: Product[],
  limit: number = 10
): TopProduct[] => {
  const productMap = new Map(products.map((p) => [p.id, p]))

  return reports
    .sort((a, b) => b.totalOut - a.totalOut)
    .slice(0, limit)
    .map((r) => ({
      productId: r.productId,
      productName: r.productName,
      sku: r.sku,
      totalOut: r.totalOut,
      currentStock: productMap.get(r.productId)?.quantity ?? 0,
    }))
}

/**
 * Filter produk low stock
 * Pure: filter array
 */
export const filterLowStockProducts = (products: Product[]): Product[] =>
  products.filter((p) => p.quantity <= p.threshold)
