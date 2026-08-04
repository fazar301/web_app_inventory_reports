// be/src/domain/report.ts

import type { Product } from "./product"
import type { Transaction } from "./transaction"

export type InventorySummary = {
  totalProducts: number
  totalItems: number
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
  products: Product[]
): InventorySummary => ({
  totalProducts: products.length,
  totalItems: products.reduce((sum, p) => sum + p.stock, 0),
  lowStockCount: products.filter(
    (p) => p.stock > 0 && p.stock <= p.threshold
  ).length,
  outOfStockCount: products.filter((p) => p.stock === 0).length,
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
  limit: number = 10
): TopProduct[] => {
  const productMap = new Map(products.map((p) => [p.id, p]))

  return reports
    .sort((a, b) => b.totalOut - a.totalOut)
    .slice(0, limit)
    .map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalOut: r.totalOut,
      currentStock: productMap.get(r.productId)?.stock ?? 0,
    }))
}

export const filterLowStockProducts = (products: Product[]): Product[] =>
  products.filter((p) => p.stock <= p.threshold)
