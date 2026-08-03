// be/src/domain/product.ts
// Domain layer: pure functions & types — NO I/O, NO framework dependency
// Following FP principles: pure, immutable, composable

// ─── Types ────────────────────────────────────────────────────────────────────

export type Product = {
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

export type NewProductInput = {
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

export type UpdateProductInput = Partial<Omit<NewProductInput, "sku">> & {
  quantity?: number
}

// ─── Pure Validation Functions ─────────────────────────────────────────────────

/**
 * SKU harus huruf kapital, angka, dan tanda hubung, panjang 3-20 karakter
 */
export const isValidSku = (sku: string): boolean =>
  /^[A-Z0-9-]{3,20}$/.test(sku)

/**
 * Nama produk tidak boleh kosong dan tidak lebih dari 200 karakter
 */
export const isValidProductName = (name: string): boolean =>
  name.trim().length >= 1 && name.trim().length <= 200

/**
 * Harga harus positif
 */
export const isValidPrice = (price: number): boolean => price >= 0

/**
 * Kuantitas tidak boleh negatif
 */
export const isValidQuantity = (qty: number): boolean =>
  qty >= 0 && Number.isInteger(qty)

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
 * Hitung nilai total stok untuk satu produk
 */
export const calculateStockValue = (quantity: number, price: number): number =>
  quantity * price

/**
 * Normalisasi SKU ke uppercase dan trim
 */
export const normalizeSku = (sku: string): string => sku.trim().toUpperCase()

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
  if (!isValidSku(normalizeSku(input.sku)))
    errors.push("SKU harus huruf kapital, angka, atau tanda hubung (3-20 karakter)")
  if (!isValidProductName(input.name))
    errors.push("Nama produk tidak boleh kosong (maks 200 karakter)")
  if (!isValidPrice(input.price))
    errors.push("Harga harus bernilai positif")
  if (input.quantity !== undefined && !isValidQuantity(input.quantity))
    errors.push("Kuantitas harus bilangan bulat non-negatif")
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
  sku: normalizeSku(input.sku),
  name: normalizeProductName(input.name),
  quantity: input.quantity ?? 0,
  threshold: input.threshold ?? 10,
  unit: input.unit ?? "pcs",
})
