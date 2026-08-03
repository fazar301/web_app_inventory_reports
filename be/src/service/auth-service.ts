// be/src/service/auth-service.ts
// Service layer: logika bisnis untuk Auth (register, login)
// DIP: bergantung pada interface UserRepo

import { hash, compare } from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import type { UserRepo } from "../repository/user-repo"
import type { RegisterInput, LoginInput } from "../domain/user"
import {
  validateRegisterInput,
  normalizeRegisterInput,
  toPublicUser,
} from "../domain/user"
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from "./errors"

// ─── JWT Config ───────────────────────────────────────────────────────────────

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET tidak diset di environment")
  return new TextEncoder().encode(secret)
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d"

const parseExpiry = (expiry: string): number => {
  const unit = expiry.slice(-1)
  const value = parseInt(expiry.slice(0, -1))
  if (unit === "d") return value * 24 * 60 * 60
  if (unit === "h") return value * 60 * 60
  if (unit === "m") return value * 60
  return 7 * 24 * 60 * 60 // default 7 hari
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export const makeAuthService = (userRepo: UserRepo) => ({
  /**
   * Registrasi user baru
   * Pipeline: normalisasi → validasi (pure) → cek duplikat → hash password → simpan
   */
  async register(input: RegisterInput) {
    // 1. Normalisasi (immutable)
    const normalized = normalizeRegisterInput(input)

    // 2. Validasi (pure)
    const errors = validateRegisterInput(normalized)
    if (errors.length > 0) throw new ValidationError(errors)

    // 3. Cek email sudah dipakai
    const existing = await userRepo.findByEmail(normalized.email)
    if (existing) throw new ConflictError("Email sudah terdaftar")

    // 4. Hash password (efek samping)
    const hashedPassword = await hash(normalized.password, 12)

    // 5. Simpan user (efek samping)
    const user = await userRepo.create({
      ...normalized,
      password: hashedPassword,
    })

    // 6. Generate JWT token
    const token = await new SignJWT({ sub: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${parseExpiry(JWT_EXPIRES_IN)}s`)
      .sign(getJwtSecret())

    return { user: toPublicUser(user), token }
  },

  /**
   * Login
   * Pipeline: normalisasi → cari user → verifikasi password → generate token
   */
  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase()

    // 1. Cari user
    const user = await userRepo.findByEmail(email)
    if (!user) throw new UnauthorizedError("Email atau password salah")

    // 2. Verifikasi password (efek samping)
    const valid = await compare(input.password, user.password)
    if (!valid) throw new UnauthorizedError("Email atau password salah")

    // 3. Generate JWT
    const token = await new SignJWT({ sub: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${parseExpiry(JWT_EXPIRES_IN)}s`)
      .sign(getJwtSecret())

    return { user: toPublicUser(user), token }
  },

  /**
   * Verifikasi JWT token — dipakai middleware auth
   */
  async verifyToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret())
      return payload as { sub: string; role: string }
    } catch {
      throw new UnauthorizedError("Token tidak valid atau sudah kadaluarsa")
    }
  },

  /**
   * Ambil profil user berdasarkan ID
   */
  async getMe(userId: string) {
    const user = await userRepo.findById(userId)
    if (!user) throw new UnauthorizedError("User tidak ditemukan")
    return toPublicUser(user)
  },
})

export type AuthService = ReturnType<typeof makeAuthService>
