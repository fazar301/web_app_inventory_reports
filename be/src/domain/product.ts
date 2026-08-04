// be/src/domain/product.ts
// Domain layer: pure functions & types — NO I/O, NO framework dependency
// Following FP principles: pure, immutable, composable

// ─── Types ────────────────────────────────────────────────────────────────────

export type Product = {
  id: string
  name: string
  description: string | null
  categoryId: string
  categoryName?: string
  threshold: number
  unit: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export type NewProductInput = {
  name: string
  description?: string
  categoryId: string
  threshold?: number
  unit?: string
  imageUrl?: string
}

export type UpdateProductInput = Partial<NewProductInput>

// ─── Pure Validation Functions ─────────────────────────────────────────────────

/**
 * Nama produk tidak boleh kosong dan tidak lebih dari 200 karakter
 */
export const isValidProductName = (name: string): boolean =>
  name.trim().length >= 1 && name.trim().length <= 200

/**
 * Threshold tidak boleh negatif
 */
export const isValidThreshold = (threshold: number): boolean =>
  threshold >= 0 && Number.isInteger(threshold)

// ─── Pure Business Logic Functions ────────────────────────────────────────────

/**
 * Cek apakah stok produk di bawah threshold (low stock alert)
 * Pure function: hanya bergantung pada input
 */
export const isLowStock = (quantity: number, threshold: number): boolean =>
  quantity <= threshold

/**
 * Normalisasi nama produk (trim whitespace)
 */
export const normalizeProductName = (name: string): string => name.trim()

/**
 * Validasi lengkap input produk baru — kembalikan array error
 * Pure function: tidak lempar exception, kembalikan hasil validasi
 */
export const validateNewProduct = (
  input: NewProductInput
): string[] => {
  const errors: string[] = []
  if (!isValidProductName(input.name))
    errors.push("Nama produk tidak boleh kosong (maks 200 karakter)")
  if (input.threshold !== undefined && !isValidThreshold(input.threshold))
    errors.push("Threshold harus bilangan bulat non-negatif")
  return errors
}

/**
 * Buat objek produk baru yang sudah dinormalisasi (immutable — kembalikan salinan baru)
 */
export const normalizeNewProduct = (
  input: NewProductInput
): NewProductInput => ({
  ...input,
  name: normalizeProductName(input.name),
  threshold: input.threshold ?? 10,
  unit: input.unit ?? "pcs",
})
