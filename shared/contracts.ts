// shared/contracts.ts
// Kontrak tipe bersama antara Frontend (Next.js) dan Backend (Hono)
// File ini DIPAKAI KEDUANYA — jangan tambahkan import dari library framework

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "STAFF"

export type UserDTO = {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export type RegisterRequest = {
  email: string
  name: string
  password: string
  role?: UserRole
}

export type LoginRequest = {
  email: string
  password: string
}

export type AuthResponse = {
  user: UserDTO
  token: string
}

// ─── Category ─────────────────────────────────────────────────────────────────

export type CategoryDTO = {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count?: { products: number }
}

export type CreateCategoryRequest = {
  name: string
  description?: string
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductDTO {
  id: string
  name: string
  description?: string
  categoryId: string
  categoryName?: string
  threshold: number
  unit: string
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export type CreateProductRequest = {
  name: string
  description?: string
  categoryId: string
  threshold?: number
  unit?: string
  imageUrl?: string
}

export type UpdateProductRequest = Partial<CreateProductRequest>

export type ProductListQuery = {
  categoryId?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: "name" | "createdAt"
  sortOrder?: "asc" | "desc"
}

export type PaginatedResponse<T> = {
  success: true
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Transaction ───────────────────────────────────────────────────────────

export type TransactionType = "IN" | "OUT"

export type TransactionDTO = {
  id: string
  productId: string
  productName: string
  type: TransactionType
  quantity: number
  amount: number
  transactionDate: string
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export type CreateTransactionRequest = {
  productId: string
  type: TransactionType
  quantity: number
  amount: number
  transactionDate: string
  notes?: string
}

export type TransactionResult = {
  transaction: TransactionDTO
  product: ProductDTO
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type InventorySummaryDTO = {
  totalProducts: number
  totalItems: number // Total seluruh sisa stok
  lowStockCount: number
  outOfStockCount: number
}

export type InventoryReportDTO = {
  productId: string
  productName: string
  categoryName: string
  stock: number
  unit: string
  lastUpdated: string
  threshold: number
}

export type TopProductDTO = {
  productId: string
  productName: string
  totalOut: number
  currentStock: number
}

// ─── Generic API Response ─────────────────────────────────────────────────────

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiError = {
  success: false
  error: string
  details?: string[]
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
