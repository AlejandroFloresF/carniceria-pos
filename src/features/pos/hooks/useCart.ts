import { create } from 'zustand'
import type { Product } from '../types/pos.types'

interface CartItem {
  product: Product
  quantity: number
}

interface CartStore {
  items: CartItem[]
  discountPercent: number
  addItem: (product: Product, qty: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  setDiscount: (pct: number) => void
  clear: () => void
  subtotal: () => number
  tax: () => number
  total: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  discountPercent: 0,

  addItem: (product, qty) => set(s => {
    const existing = s.items.find(i => i.product.id === product.id)
    if (existing) {
      return { items: s.items.map(i =>
        i.product.id === product.id
          ? { ...i, quantity: +(i.quantity + qty).toFixed(3) }
          : i
      )}
    }
    return { items: [...s.items, { product, quantity: qty }] }
  }),

  removeItem: id => set(s => ({ items: s.items.filter(i => i.product.id !== id) })),

  updateQty: (id, qty) => set(s => ({
    items: qty <= 0
      ? s.items.filter(i => i.product.id !== id)
      : s.items.map(i => i.product.id === id ? { ...i, quantity: qty } : i)
  })),

  setDiscount: pct => set({ discountPercent: pct }),
  clear: () => set({ items: [], discountPercent: 0 }),

  subtotal: () =>
  get().items.reduce((sum, i) => {
    const price = (i.product as any).effectivePrice
      ?? (i.product as any).pricePerUnit
      ?? 0
    return sum + price * i.quantity
  }, 0),
  tax: () => {
    const s = get(); const sub = s.subtotal()
    return (sub - sub * (s.discountPercent / 100)) * 0.16
  },
  total: () => {
    const s = get(); const sub = s.subtotal()
    const discounted = sub - sub * (s.discountPercent / 100)
    return discounted + discounted * 0.16
  },
}))