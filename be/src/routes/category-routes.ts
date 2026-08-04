// be/src/routes/category-routes.ts
// Route layer: adaptor HTTP untuk Category endpoints

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { makeCategoryService } from "../service/category-service"
import { createPrismaCategoryRepo } from "../repository/category-repo"
import { authMiddleware, adminOnly } from "../middleware/auth"
import { db } from "../lib/db"

const categoryService = makeCategoryService(createPrismaCategoryRepo(db))

const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori tidak boleh kosong").max(100),
  description: z.string().optional(),
})

export const categoryRoutes = new Hono()

categoryRoutes.use("*", authMiddleware())

/**
 * GET /api/categories
 */
categoryRoutes.get("/", async (c) => {
  const cats = await categoryService.listCategories()
  return c.json({ success: true, data: cats })
})

/**
 * GET /api/categories/:id
 */
categoryRoutes.get("/:id", async (c) => {
  const cat = await categoryService.getCategory(c.req.param("id"))
  return c.json({ success: true, data: cat })
})

/**
 * POST /api/categories
 */
categoryRoutes.post("/", adminOnly(), zValidator("json", categorySchema), async (c) => {
  const body = c.req.valid("json")
  const cat = await categoryService.createCategory(body)
  return c.json({ success: true, data: cat }, 201)
})

/**
 * PUT /api/categories/:id
 */
categoryRoutes.put(
  "/:id",
  adminOnly(),
  zValidator("json", categorySchema.partial()),
  async (c) => {
    const id = c.req.param("id")
    const body = c.req.valid("json")
    const cat = await categoryService.updateCategory(id, body)
    return c.json({ success: true, data: cat })
  }
)

/**
 * DELETE /api/categories/:id
 */
categoryRoutes.delete("/:id", adminOnly(), async (c) => {
  const result = await categoryService.deleteCategory(c.req.param("id"))
  return c.json({ success: true, data: result })
})
