import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Product, CartItem, Customer, ProductWithPrice } from '@/features/pos/types/pos.types'

const CART_DEFAULTS = {
  items: [] as CartItem[],
  discountPercent: 0,
  selectedProduct: null as Product | null,
  selectedCustomer: null as Customer | null,
  loadedOrderId: null as string | null,   // tracks which customer order is loaded
}

interface PosStore {
  // Cart
  items: CartItem[]
  discountPercent: number
  selectedProduct: Product | null
  selectedCustomer: Customer | null
  addItem: (product: ProductWithPrice, qty: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  setDiscount: (pct: number) => void
  selectProduct: (p: Product | null) => void
  loadedOrderId: string | null
  setCustomer: (c: Customer | null) => void
  setLoadedOrder: (id: string | null) => void
  resetCart: () => void
  subtotal: () => number
  discountAmount: () => number
  total: () => number
  updateItemPrice: (productId: string, newPrice: number) => void


  // Session
  session: { id: string; cashierName: string; openedAt: string; openingCash: number } | null
  saleCount: number
  defaultCustomer: Customer | null                    // ← nuevo
  openSession: (name: string, cash: number, id: string, openedAt?: string) => void
  closeSession: () => void
  incrementSaleCount: () => void
  setDefaultCustomer: (c: Customer | null) => void   // ← nuevo
}

export const usePosStore = create<PosStore>()(
  persist(
    (set, get) => ({
      ...CART_DEFAULTS,

      addItem: (product: ProductWithPrice, qty: number) =>
        set(s => {
          const existing = s.items.find(i => i.product.id === product.id)
          if (existing) {
            return {
              items: s.items.map(i =>
                i.product.id === product.id
                  ? { ...i, quantity: +(i.quantity + qty).toFixed(3) }
                  : i
              ),
            }
          }
          return { items: [...s.items, { product: product as unknown as Product, quantity: qty }] }
        }),

      removeItem: id =>
        set(s => ({ items: s.items.filter(i => i.product.id !== id) })),

      updateQty: (id, qty) =>
        set(s => ({
          items:
            qty <= 0
              ? s.items.filter(i => i.product.id !== id)
              : s.items.map(i =>
                  i.product.id === id ? { ...i, quantity: +qty.toFixed(3) } : i
                ),
        })),

      setDiscount: pct => set({ discountPercent: Math.min(100, Math.max(0, pct)) }),
      selectProduct: p => set({ selectedProduct: p }),
      setLoadedOrder: id => set({ loadedOrderId: id }),

      setCustomer: (customer) => set({
        selectedCustomer: customer,
        discountPercent: customer ? customer.discountPercent : 0,
      }),

      updateItemPrice: (productId, newPrice) =>
        set(s => ({
          items: s.items.map(i =>
            i.product.id === productId
              ? {
                  ...i,
                  product: {
                    ...i.product,
                    effectivePrice: newPrice,
                  }
                }
              : i
          ),
        })),

      resetCart: () =>
        set(s => ({
          ...CART_DEFAULTS,
          selectedCustomer: s.defaultCustomer,
          discountPercent: s.defaultCustomer?.discountPercent ?? 0,
          loadedOrderId: null,
        })),

      subtotal: () =>
        get().items.reduce(
          (sum, i) => sum + (i.product.effectivePrice ?? i.product.pricePerUnit) * i.quantity, 0
        ),
      discountAmount: () => {
        const { subtotal, discountPercent } = get()
        return subtotal() * (discountPercent / 100)
      },

      clientColor: () => {
        const s = get()
        const isDefault = s.selectedCustomer?.id === s.defaultCustomer?.id
        return isDefault ? '#6366f1' : (s.selectedCustomer as any)?.color ?? '#6366f1'
      },
      total: () => {
        const { subtotal, discountAmount } = get()
        return subtotal() - discountAmount()
      },

      // Session
      session: null,
      saleCount: 0,
      defaultCustomer: null,

      openSession: (cashierName: string, openingCash: number, id: string, openedAt?: string) =>
      set({
        session: {
          id,
          cashierName,
          openedAt: openedAt ?? new Date().toISOString(),
          openingCash,
        },
        saleCount:        0,
        items:            [],
        discountPercent:  0,
        selectedProduct:  null,
        selectedCustomer: null,
      }),
      closeSession: () =>
        set({ session: null, saleCount: 0, defaultCustomer: null, ...CART_DEFAULTS }),

      incrementSaleCount: () =>
        set(s => ({ saleCount: s.saleCount + 1 })),

      setDefaultCustomer: (c) =>
        set({ defaultCustomer: c, selectedCustomer: c, discountPercent: c?.discountPercent ?? 0 }),
    }),
    {
      name: 'pos-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: s => ({
        session: s.session,
        saleCount: s.saleCount,
        defaultCustomer: s.defaultCustomer,
        selectedCustomer: s.selectedCustomer,
        discountPercent: s.discountPercent,
      }),
    }
  )
)

