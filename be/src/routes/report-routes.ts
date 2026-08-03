// be/src/routes/report-routes.ts
// Route layer: adaptor HTTP untuk Report endpoints

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { makeReportService } from "../service/report-service"
import { createPrismaProductRepo } from "../repository/product-repo"
import { createPrismaStockMovementRepo } from "../repository/stock-movement-repo"
import { authMiddleware } from "../middleware/auth"
import { db } from "../lib/db"

const reportService = makeReportService(
  createPrismaProductRepo(db),
  createPrismaStockMovementRepo(db)
)

const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const detailedMovementsSchema = dateRangeSchema.extend({
  productId: z.string().optional(),
  type: z.enum(["IN", "OUT"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const reportRoutes = new Hono()

reportRoutes.use("*", authMiddleware())

/**
 * GET /api/reports/summary
 * Ringkasan inventori: total produk, item, nilai total, low stock count
 */
reportRoutes.get("/summary", async (c) => {
  const summary = await reportService.getInventorySummary()
  return c.json({ success: true, data: summary })
})

/**
 * GET /api/reports/stock-movements
 * Laporan pergerakan stok per produk (aggregasi IN/OUT/net)
 */
reportRoutes.get(
  "/stock-movements",
  zValidator("query", dateRangeSchema),
  async (c) => {
    const query = c.req.valid("query")
    const data = await reportService.getStockMovementReport(query)
    return c.json({ success: true, data })
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
 * GET /api/reports/movements-detail
 * Detail pergerakan stok dengan filter & pagination
 */
reportRoutes.get(
  "/movements-detail",
  zValidator("query", detailedMovementsSchema),
  async (c) => {
    const query = c.req.valid("query")
    const result = await reportService.getDetailedMovements(query)
    return c.json({ success: true, ...result })
  }
)
