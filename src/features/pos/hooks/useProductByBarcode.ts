import { api } from '@/lib/api'
import type { Product } from '../types/pos.types'

/** Fetches a product by barcode/PLU — imperative (called on each scan, not reactive). */
export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    const { data } = await api.get<Product>(`/products/by-barcode/${encodeURIComponent(barcode)}`)
    return data
  } catch {
    return null
  }
}
