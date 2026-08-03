// be/src/repository/user-repo.ts
// Repository layer: interface + implementasi Prisma untuk User

import type { PrismaClient } from "@prisma/client"
import type { User, RegisterInput, UserRole } from "../domain/user"

// ─── Interface (ISP) ──────────────────────────────────────────────────────────

export interface UserRepo {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(input: RegisterInput & { password: string }): Promise<User>
  list(): Promise<User[]>
}

// ─── Implementasi Prisma ──────────────────────────────────────────────────────

const toUser = (raw: any): User => ({
  id: raw.id,
  email: raw.email,
  name: raw.name,
  password: raw.password,
  role: raw.role as UserRole,
  createdAt: raw.createdAt.toISOString(),
  updatedAt: raw.updatedAt.toISOString(),
})

export const createPrismaUserRepo = (db: PrismaClient): UserRepo => ({
  async findById(id) {
    const raw = await db.user.findUnique({ where: { id } })
    return raw ? toUser(raw) : null
  },

  async findByEmail(email) {
    const raw = await db.user.findUnique({ where: { email } })
    return raw ? toUser(raw) : null
  },

  async create(input) {
    const raw = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: input.password,
        role: (input.role ?? "STAFF") as any,
      },
    })
    return toUser(raw)
  },

  async list() {
    const raws = await db.user.findMany({ orderBy: { createdAt: "desc" } })
    return raws.map(toUser)
  },
})
