// be/src/routes/report-routes.ts
// Route layer: adaptor HTTP untuk Report endpoints

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { makeReportService } from "../service/report-service"
import { createPrismaProductRepo } from "../repository/product-repo"
import { createPrismaTransactionRepo } from "../repository/transaction-repo"
import { createPrismaCategoryRepo } from "../repository/category-repo"
import { authMiddleware } from "../middleware/auth"
import { db } from "../lib/db"

const reportService = makeReportService(
  createPrismaProductRepo(db),
  createPrismaTransactionRepo(db),
  createPrismaCategoryRepo(db)
)

const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const inventoryQuerySchema = dateRangeSchema.extend({
  categoryId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
  sortBy: z.enum(["name", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
})

const detailedTransactionsSchema = dateRangeSchema.extend({
  productId: z.string().optional(),
  type: z.enum(["IN", "OUT"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const reportRoutes = new Hono()

reportRoutes.use("*", authMiddleware())

/**
 * GET /api/reports/summary
 * Ringkasan inventori: total produk, item, low stock count
 */
reportRoutes.get("/summary", async (c) => {
  const summary = await reportService.getInventorySummary()
  return c.json({ success: true, data: summary })
})

/**
 * GET /api/reports/inventory
 * Daftar Inventaris: List produk lengkap dengan stok (bisa difilter tanggal)
 */
reportRoutes.get(
  "/inventory",
  zValidator("query", inventoryQuerySchema),
  async (c) => {
    const query = c.req.valid("query")
    const data = await reportService.getInventoryReport(query)
    return c.json({ success: true, ...data })
  }
)

/**
 * GET /api/reports/low-stock
 * Produk dengan stok di bawah atau sama dengan threshold
 */
reportRoutes.get("/low-stock", async (c) => {
  const data = await reportService.getLowStockProducts()
  return c.json({ success: true, data, count: data.length })
})

/**
 * GET /api/reports/top-products
 * Produk dengan total pengeluaran (OUT) terbanyak
 */
reportRoutes.get(
  "/top-products",
  zValidator("query", dateRangeSchema.extend({
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })),
  async (c) => {
    const { limit, ...range } = c.req.valid("query")
    const data = await reportService.getTopProducts(limit, range)
    return c.json({ success: true, data })
  }
)

/**
 * GET /api/reports/transactions-detail
 * Detail pergerakan stok dengan filter & pagination
 */
reportRoutes.get(
  "/transactions-detail",
  zValidator("query", detailedTransactionsSchema),
  async (c) => {
    const query = c.req.valid("query")
    const result = await reportService.getDetailedTransactions(query)
    return c.json({ success: true, ...result })
  }
)
