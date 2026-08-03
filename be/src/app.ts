// be/src/app.ts
// Entry point: compose semua route & middleware
// OCP: tambah fitur = tambah route baru, tidak ubah app.ts ini

import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { authRoutes } from "./routes/auth-routes"
import { productRoutes } from "./routes/product-routes"
import { categoryRoutes } from "./routes/category-routes"
import { stockRoutes } from "./routes/stock-routes"
import { reportRoutes } from "./routes/report-routes"
import { globalErrorHandler } from "./middleware/error-handler"

const app = new Hono()

// ─── Global Middleware ─────────────────────────────────────────────────────────
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ status: "ok", message: "Inventory API is running" }))
app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }))

// ─── API Routes ────────────────────────────────────────────────────────────────
app.route("/api/auth", authRoutes)
app.route("/api/products", productRoutes)
app.route("/api/categories", categoryRoutes)
app.route("/api/stock-movements", stockRoutes)
app.route("/api/reports", reportRoutes)

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ success: false, error: "Endpoint tidak ditemukan" }, 404)
)

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.onError(globalErrorHandler)

// ─── Start Server ─────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? "3001")
console.log(`🚀 Inventory API running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
