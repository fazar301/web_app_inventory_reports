// be/src/middleware/auth.ts
// Middleware JWT authentication untuk Hono
// Gunakan sebagai: authMiddleware() pada route yang butuh auth

import { createMiddleware } from "hono/factory"
import { UnauthorizedError, ForbiddenError } from "../service/errors"
import { makeAuthService } from "../service/auth-service"
import { createPrismaUserRepo } from "../repository/user-repo"
import { db } from "../lib/db"

const authService = makeAuthService(createPrismaUserRepo(db))

type AuthVariables = {
  userId: string
  userRole: string
}

/**
 * Middleware: verifikasi Bearer token dari Authorization header
 * Menyimpan userId & userRole ke context.var untuk dipakai handler
 */
export const authMiddleware = () =>
  createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const authHeader = c.req.header("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authorization header tidak ditemukan")
    }

    const token = authHeader.slice(7)
    const payload = await authService.verifyToken(token)

    c.set("userId", payload.sub)
    c.set("userRole", payload.role)

    await next()
  })

/**
 * Middleware: hanya ADMIN yang boleh lanjut
 */
export const adminOnly = () =>
  createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const role = c.get("userRole")
    if (role !== "ADMIN") {
      throw new ForbiddenError("Hanya ADMIN yang dapat mengakses endpoint ini")
    }
    await next()
  })
