// be/src/routes/auth-routes.ts
// Route layer: adaptor HTTP untuk Auth endpoints
// SRP: hanya parse request → panggil service → format response
// TIDAK ada logika bisnis di sini

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { makeAuthService } from "../service/auth-service"
import { createPrismaUserRepo } from "../repository/user-repo"
import { authMiddleware } from "../middleware/auth"
import { db } from "../lib/db"

type AuthVars = { Variables: { userId: string; userRole: string } }

// ─── Dependency Injection ─────────────────────────────────────────────────────
const authService = makeAuthService(createPrismaUserRepo(db))

// ─── Zod Schemas (validasi bentuk request, bukan logika bisnis) ───────────────
const registerSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  name: z.string().min(1, "Nama tidak boleh kosong"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Routes ───────────────────────────────────────────────────────────────────
export const authRoutes = new Hono<AuthVars>()

/**
 * POST /api/auth/register
 * Daftarkan user baru
 */
authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const body = c.req.valid("json")
  const result = await authService.register(body)
  return c.json({ success: true, data: result }, 201)
})

/**
 * POST /api/auth/login
 * Login dan dapatkan JWT token
 */
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const body = c.req.valid("json")
  const result = await authService.login(body)
  return c.json({ success: true, data: result })
})

/**
 * GET /api/auth/me
 * Ambil profil user yang sedang login (butuh auth)
 */
authRoutes.get("/me", authMiddleware(), async (c) => {
  const userId = c.get("userId")
  const user = await authService.getMe(userId)
  return c.json({ success: true, data: user })
})
