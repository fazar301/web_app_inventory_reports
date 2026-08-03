// be/src/middleware/error-handler.ts
// Terpusat error handling: translate DomainError → HTTP status
// Semua error di service/repository naik ke sini

import { Hono } from "hono"
import {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from "../service/errors"

type ApiError = {
  success: false
  error: string
  details?: string[]
  status: number
}

/**
 * Translate DomainError → HTTP status code
 */
export const errorToStatus = (error: DomainError): number => {
  if (error instanceof ValidationError) return 400
  if (error instanceof UnauthorizedError) return 401
  if (error instanceof ForbiddenError) return 403
  if (error instanceof NotFoundError) return 404
  if (error instanceof ConflictError) return 409
  return 400
}

/**
 * Terpusat error response builder
 */
export const buildErrorResponse = (error: unknown): ApiError => {
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: "Validasi gagal",
      details: error.errors,
      status: 400,
    }
  }
  if (error instanceof DomainError) {
    return {
      success: false,
      error: error.message,
      status: errorToStatus(error),
    }
  }

  console.error("[UnhandledError]", error)
  return {
    success: false,
    error: "Terjadi kesalahan server",
    status: 500,
  }
}

/**
 * Global error handler untuk Hono app
 * Dipasang di app.ts sebagai app.onError(...)
 */
export const globalErrorHandler = (err: Error, c: any) => {
  const response = buildErrorResponse(err)
  return c.json(
    { success: response.success, error: response.error, details: response.details },
    response.status as any
  )
}
