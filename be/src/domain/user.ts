// be/src/domain/user.ts
// Domain layer: pure functions untuk auth & user
// NO I/O, NO framework dependency

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "STAFF"

export type User = {
  id: string
  email: string
  name: string
  password: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export type PublicUser = Omit<User, "password">

export type RegisterInput = {
  email: string
  name: string
  password: string
  role?: UserRole
}

export type LoginInput = {
  email: string
  password: string
}

// ─── Pure Validation Functions ─────────────────────────────────────────────────

/**
 * Validasi format email
 */
export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

/**
 * Password minimal 8 karakter
 */
export const isValidPassword = (password: string): boolean =>
  password.length >= 8

/**
 * Nama tidak boleh kosong
 */
export const isValidName = (name: string): boolean =>
  name.trim().length >= 1 && name.trim().length <= 100

/**
 * Validasi input registrasi — kembalikan array error
 */
export const validateRegisterInput = (input: RegisterInput): string[] => {
  const errors: string[] = []
  if (!isValidEmail(input.email.trim()))
    errors.push("Format email tidak valid")
  if (!isValidPassword(input.password))
    errors.push("Password minimal 8 karakter")
  if (!isValidName(input.name))
    errors.push("Nama tidak boleh kosong (maks 100 karakter)")
  return errors
}

// ─── Pure Transforms ──────────────────────────────────────────────────────────

/**
 * Normalisasi email (lowercase, trim)
 */
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase()

/**
 * Hapus password dari user object (immutable — buat objek baru)
 */
export const toPublicUser = (user: User): PublicUser => {
  const { password: _pw, ...publicUser } = user
  return publicUser
}

/**
 * Normalisasi input register (immutable)
 */
export const normalizeRegisterInput = (input: RegisterInput): RegisterInput => ({
  ...input,
  email: normalizeEmail(input.email),
  name: input.name.trim(),
  role: input.role ?? "STAFF",
})
