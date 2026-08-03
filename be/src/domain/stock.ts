// be/src/domain/stock.ts
// Domain layer: pure functions untuk stock movement
// NO I/O, NO framework dependency

// ─── Types ────────────────────────────────────────────────────────────────────

export type MovementType = "IN" | "OUT"

export type StockMovement = {
  id: string
  productId: string
  type: MovementType
  quantity: number
  note: string | null
  reference: string | null
  createdBy: string | null
  createdAt: string
}

export type NewStockMovementInput = {
  productId: string
  type: MovementType
  quantity: number
  note?: string
  reference?: string
  createdBy?: string
}

// ─── Pure Business Logic ───────────────────────────────────────────────────────

/**
 * Hitung stok setelah pergerakan
 * Pure: hanya bergantung input, tidak ada I/O
 */
export const applyMovement = (
  currentQuantity: number,
  movementQty: number,
  type: MovementType
): number => {
  if (type === "IN") return currentQuantity + movementQty
  return currentQuantity - movementQty
}

/**
 * Cek apakah stok cukup untuk pengeluaran (OUT)
 */
export const canDeductStock = (
  currentQuantity: number,
  deductQty: number
): boolean => currentQuantity >= deductQty

/**
 * Validasi input pergerakan stok — kembalikan array error
 */
export const validateStockMovement = (
  input: NewStockMovementInput,
  currentQuantity: number
): string[] => {
  const errors: string[] = []

  if (input.quantity <= 0 || !Number.isInteger(input.quantity))
    errors.push("Jumlah harus bilangan bulat positif")

  if (!["IN", "OUT"].includes(input.type))
    errors.push("Tipe harus IN atau OUT")

  if (input.type === "OUT" && !canDeductStock(currentQuantity, input.quantity))
    errors.push(
      `Stok tidak mencukupi. Stok saat ini: ${currentQuantity}, permintaan: ${input.quantity}`
    )

  return errors
}

/**
 * Normalisasi input movement (immutable)
 */
export const normalizeMovementInput = (
  input: NewStockMovementInput
): NewStockMovementInput => ({
  ...input,
  note: input.note?.trim() || undefined,
  reference: input.reference?.trim() || undefined,
})
