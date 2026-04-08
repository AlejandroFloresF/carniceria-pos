export interface StockStatusDto {
  productId: string
  productName: string
  category: string
  unit: string
  currentStockKg: number
  minimumStockKg: number
  isBelowMinimum: boolean
  totalSoldLast7Days: number
  totalWasteLast7Days: number
  averageDailySales: number
  pricePerUnit: number
  salePrice: number
}

export interface StockMovementDto {
  date: string
  type: string
  quantityKg: number
  stockAfter: number
  reference: string | null
}

export interface InventoryEntryDto {
  id: string
  productId: string
  productName: string
  quantityKg: number
  costPerKg: number
  source: string
  notes: string | null
  entryDate: string
}

export interface ProductPriceHistoryDto {
  id: string
  oldPrice: number
  newPrice: number
  changedAt: string
}

export interface WasteRecordDto {
  id: string
  productId: string
  productName: string
  quantityKg: number
  reason: string
  notes: string | null
  wasteDate: string
}