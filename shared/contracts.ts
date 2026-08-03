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

export type ProductDTO = {
  id: string
  sku: string
  name: string
  description: string | null
  categoryId: string
  price: number
  quantity: number
  threshold: number
  unit: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export type CreateProductRequest = {
  sku: string
  name: string
  description?: string
  categoryId: string
  price: number
  quantity?: number
  threshold?: number
  unit?: string
  imageUrl?: string
}

export type UpdateProductRequest = Partial<Omit<CreateProductRequest, "sku">>

export type ProductListQuery = {
  categoryId?: string
  search?: string
  lowStock?: boolean
  page?: number
  limit?: number
  sortBy?: "name" | "price" | "quantity" | "createdAt"
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

// ─── Stock Movement ───────────────────────────────────────────────────────────

export type MovementType = "IN" | "OUT"

export type StockMovementDTO = {
  id: string
  productId: string
  productName: string
  sku: string
  type: MovementType
  quantity: number
  note: string | null
  reference: string | null
  createdBy: string | null
  createdAt: string
}

export type CreateStockMovementRequest = {
  productId: string
  type: MovementType
  quantity: number
  note?: string
  reference?: string
}

export type StockMovementResult = {
  movement: StockMovementDTO
  product: ProductDTO
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type InventorySummaryDTO = {
  totalProducts: number
  totalItems: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}

export type StockMovementReportDTO = {
  productId: string
  productName: string
  sku: string
  totalIn: number
  totalOut: number
  netChange: number
}

export type TopProductDTO = {
  productId: string
  productName: string
  sku: string
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
