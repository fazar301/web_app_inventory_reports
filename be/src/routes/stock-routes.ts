// be/src/routes/stock-routes.ts
// Route layer: adaptor HTTP untuk Stock Movement endpoints

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { makeStockService } from "../service/stock-service"
import { createPrismaProductRepo } from "../repository/product-repo"
import { createPrismaStockMovementRepo } from "../repository/stock-movement-repo"
import { authMiddleware } from "../middleware/auth"
import { db } from "../lib/db"

type AuthVars = { Variables: { userId: string; userRole: string } }

const stockService = makeStockService(
  createPrismaProductRepo(db),
  createPrismaStockMovementRepo(db)
)

const newMovementSchema = z.object({
  productId: z.string().min(1, "Product ID diperlukan"),
  type: z.enum(["IN", "OUT"], { message: "Tipe harus IN atau OUT" }),
  quantity: z.number().int().positive("Jumlah harus lebih dari 0"),
  note: z.string().optional(),
  reference: z.string().optional(),
})

const listQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.enum(["IN", "OUT"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const stockRoutes = new Hono<AuthVars>()

stockRoutes.use("*", authMiddleware())

/**
 * GET /api/stock-movements
 * Daftar semua pergerakan stok
 */
stockRoutes.get("/", zValidator("query", listQuerySchema), async (c) => {
  const query = c.req.valid("query")
  const result = await stockService.listMovements({
    ...query,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  })
  return c.json({ success: true, ...result })
})

/**
 * GET /api/stock-movements/product/:productId
 * Pergerakan stok untuk satu produk
 */
stockRoutes.get("/product/:productId", async (c) => {
  const productId = c.req.param("productId")
  const movements = await stockService.getProductMovements(productId)
  return c.json({ success: true, data: movements })
})

/**
 * POST /api/stock-movements
 * Catat pergerakan stok baru (IN atau OUT)
 */
stockRoutes.post(
  "/",
  zValidator("json", newMovementSchema),
  async (c) => {
    const body = c.req.valid("json")
    const userId = c.get("userId")
    const result = await stockService.recordMovement({
      ...body,
      createdBy: userId,
    })
    return c.json({ success: true, data: result }, 201)
  }
)
