// be/src/domain/transaction.ts

export type TransactionType = "IN" | "OUT"

export type Transaction = {
  id: string
  productId: string
  type: TransactionType
  quantity: number
  amount: number
  transactionDate: string
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export type NewTransactionInput = {
  productId: string
  type: TransactionType
  quantity: number
  amount: number
  transactionDate: string
  notes?: string
}

export const isValidQuantity = (qty: number): boolean => qty > 0 && Number.isInteger(qty)
export const isValidAmount = (amt: number): boolean => amt >= 0

export const validateNewTransaction = (input: NewTransactionInput): string[] => {
  const errors: string[] = []
  if (!isValidQuantity(input.quantity)) errors.push("Kuantitas harus lebih dari 0")
  if (!isValidAmount(input.amount)) errors.push("Amount harus positif")
  return errors
}
