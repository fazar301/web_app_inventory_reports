// be/src/routes/transaction-routes.ts

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { makeTransactionService } from "../service/transaction-service"
import { createPrismaTransactionRepo } from "../repository/transaction-repo"
import { createPrismaProductRepo } from "../repository/product-repo"
import { authMiddleware } from "../middleware/auth"
import { db } from "../lib/db"

const transactionService = makeTransactionService(
  createPrismaProductRepo(db),
  createPrismaTransactionRepo(db)
)

const newTransactionSchema = z.object({
  productId: z.string().min(1, "Product ID diperlukan"),
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().int().min(1, "Kuantitas minimal 1"),
  amount: z.number().min(0, "Amount harus positif"),
  transactionDate: z.string().datetime(),
  notes: z.string().optional(),
})

const listQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.enum(["IN", "OUT"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const transactionRoutes = new Hono()

transactionRoutes.use("*", authMiddleware())

transactionRoutes.post(
  "/",
  zValidator("json", newTransactionSchema),
  async (c) => {
    const body = c.req.valid("json")
    const user = c.get("user") // From auth middleware

    const result = await transactionService.recordTransaction({
      ...body,
      // Pass createdBy from JWT user logic here if supported
    })

    return c.json({ success: true, data: result }, 201)
  }
)

transactionRoutes.get("/", zValidator("query", listQuerySchema), async (c) => {
  const query = c.req.valid("query")
  const result = await transactionService.listTransactions(query)
  return c.json({ success: true, ...result })
})

transactionRoutes.get("/product/:productId", async (c) => {
  const productId = c.req.param("productId")
  const result = await transactionService.getProductTransactions(productId)
  return c.json({ success: true, data: result })
})
