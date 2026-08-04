// be/src/domain/report.ts

import type { Product } from "./product"
import type { Transaction } from "./transaction"

export type InventorySummary = {
  totalProducts: number
  totalCategories: number
  lowStockCount: number
  outOfStockCount: number
}

export type TransactionReport = {
  productId: string
  productName: string
  totalIn: number
  totalOut: number
  netChange: number
}

export type TopProduct = {
  productId: string
  productName: string
  totalOut: number
  currentStock: number
}

export const calculateInventorySummary = (
  products: Product[],
  stockMap: Record<string, number>,
  totalCategories: number
): InventorySummary => ({
  totalProducts: products.length,
  totalCategories,
  lowStockCount: products.filter((p) => {
    const stock = stockMap[p.id] || 0
    return stock > 0 && stock <= p.threshold
  }).length,
  outOfStockCount: products.filter((p) => (stockMap[p.id] || 0) === 0).length,
})

export const aggregateTransactionsByProduct = (
  transactions: (Transaction & { productName: string })[]
): TransactionReport[] => {
  const map = new Map<string, TransactionReport>()

  for (const m of transactions) {
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
        totalIn: m.type === "IN" ? m.quantity : 0,
        totalOut: m.type === "OUT" ? m.quantity : 0,
        netChange: m.type === "IN" ? m.quantity : -m.quantity,
      })
    }
  }

  return Array.from(map.values())
}

export const getTopOutProducts = (
  reports: TransactionReport[],
  products: Product[],
  stockMap: Record<string, number>,
  limit: number = 10
): TopProduct[] => {
  return reports
    .sort((a, b) => b.totalOut - a.totalOut)
    .slice(0, limit)
    .map((report) => {
      const product = products.find((p) => p.id === report.productId)
      return {
        productId: report.productId,
        productName: report.productName,
        totalOut: report.totalOut,
        currentStock: stockMap[report.productId] || 0,
      }
    })
}

export const filterLowStockProducts = (
  products: Product[],
  stockMap: Record<string, number>
): (Product & { stock: number })[] => {
  return products
    .map((p) => ({ ...p, stock: stockMap[p.id] || 0 }))
    .filter((p) => p.stock <= p.threshold)
}
