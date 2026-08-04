// be/src/routes/product-routes.ts
// Route layer: adaptor HTTP untuk Product endpoints
// SRP: hanya parse, validasi bentuk (Zod), panggil service, format response

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { makeProductService } from "../service/product-service"
import { createPrismaProductRepo } from "../repository/product-repo"
import { createPrismaCategoryRepo } from "../repository/category-repo"
import { authMiddleware } from "../middleware/auth"
import { db } from "../lib/db"

// ─── Dependency Injection ─────────────────────────────────────────────────────
const productService = makeProductService(
  createPrismaProductRepo(db),
  createPrismaCategoryRepo(db)
)

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const newProductSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong").max(200),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category ID diperlukan"),
  threshold: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
})

const updateProductSchema = newProductSchema.partial()

const listQuerySchema = z.object({
  categoryId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["name", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
})

// ─── Routes ───────────────────────────────────────────────────────────────────
export const productRoutes = new Hono()

// Semua product routes butuh auth
productRoutes.use("*", authMiddleware())

/**
 * GET /api/products
 * Daftar produk dengan filter & pagination
 */
productRoutes.get("/", zValidator("query", listQuerySchema), async (c) => {
  const query = c.req.valid("query")
  const result = await productService.listProducts(query)
  return c.json({ success: true, ...result })
})

/**
 * GET /api/products/:id
 * Detail satu produk
 */
productRoutes.get("/:id", async (c) => {
  const id = c.req.param("id")
  const product = await productService.getProduct(id)
  return c.json({ success: true, data: product })
})

/**
 * POST /api/products
 * Buat produk baru
 */
productRoutes.post(
  "/",
  zValidator("json", newProductSchema),
  async (c) => {
    const body = c.req.valid("json")
    const product = await productService.createProduct(body)
    return c.json({ success: true, data: product }, 201)
  }
)

/**
 * PUT /api/products/:id
 * Update produk
 */
productRoutes.put(
  "/:id",
  zValidator("json", updateProductSchema),
  async (c) => {
    const id = c.req.param("id")
    const body = c.req.valid("json")
    const product = await productService.updateProduct(id, body)
    return c.json({ success: true, data: product })
  }
)

/**
 * DELETE /api/products/:id
 * Hapus produk
 */
productRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id")
  const result = await productService.deleteProduct(id)
  return c.json({ success: true, data: result })
})
