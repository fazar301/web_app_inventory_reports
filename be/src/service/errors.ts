// be/src/service/errors.ts
// Centralized domain errors — service lempar ini, route translate ke HTTP status

/**
 * Base class untuk semua error domain bisnis
 * Route akan menangkap ini dan translate ke HTTP status yang sesuai
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DomainError"
  }
}

/** Entitas tidak ditemukan */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} dengan ID '${id}' tidak ditemukan`)
    this.name = "NotFoundError"
  }
}

/** Validasi input gagal */
export class ValidationError extends DomainError {
  constructor(public readonly errors: string[]) {
    super(errors.join(", "))
    this.name = "ValidationError"
  }
}

/** Konflik data (duplikat) */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
  }
}

/** Unauthorized */
export class UnauthorizedError extends DomainError {
  constructor(message: string = "Tidak terautentikasi") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

/** Forbidden */
export class ForbiddenError extends DomainError {
  constructor(message: string = "Tidak memiliki izin") {
    super(message)
    this.name = "ForbiddenError"
  }
}
