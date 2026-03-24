import type { Product, TicketDto, CashierSessionDto, SessionSummaryDto, Customer } from '@/features/pos/types/pos.types'

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Arrachera',      category: 'Res',       pricePerUnit: 280, unit: 'kg',    stockKg: 15 },
  { id: '2', name: 'Costilla res',   category: 'Res',       pricePerUnit: 190, unit: 'kg',    stockKg: 20 },
  { id: '3', name: 'Milanesa res',   category: 'Res',       pricePerUnit: 210, unit: 'kg',    stockKg: 12 },
  { id: '4', name: 'Bistec',         category: 'Res',       pricePerUnit: 240, unit: 'kg',    stockKg: 18 },
  { id: '5', name: 'Chuleta cerdo',  category: 'Cerdo',     pricePerUnit: 160, unit: 'kg',    stockKg: 22 },
  { id: '6', name: 'Lomo cerdo',     category: 'Cerdo',     pricePerUnit: 185, unit: 'kg',    stockKg: 10 },
  { id: '7', name: 'Costilla cerdo', category: 'Cerdo',     pricePerUnit: 150, unit: 'kg',    stockKg: 25 },
  { id: '8', name: 'Chorizo',        category: 'Embutidos', pricePerUnit: 120, unit: 'kg',    stockKg: 8  },
  { id: '9', name: 'Salchicha',      category: 'Embutidos', pricePerUnit: 90,  unit: 'kg',    stockKg: 6  },
  { id: '10', name: 'Pollo entero',  category: 'Pollo',     pricePerUnit: 75,  unit: 'kg',    stockKg: 30 },
  { id: '11', name: 'Pechuga',       category: 'Pollo',     pricePerUnit: 110, unit: 'kg',    stockKg: 20 },
  { id: '12', name: 'Muslo/pierna',  category: 'Pollo',     pricePerUnit: 65,  unit: 'kg',    stockKg: 25 },
]

let folioCounter = 42
let orderIdCounter = 1

export function generateTicket(
  items: { productId: string; quantity: number }[],
  discountPercent: number,
  paymentMethod: string,
  cashReceived: number,
  cashierName: string
): TicketDto {
  const ticketItems = items.map(item => {
    const product = MOCK_PRODUCTS.find(p => p.id === item.productId)!
    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unit: product.unit,
      unitPrice: product.pricePerUnit,
      total: +(product.pricePerUnit * item.quantity).toFixed(2),
    }
  })

  const subtotal = ticketItems.reduce((s, i) => s + i.total, 0)
  const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2)
  const taxable = subtotal - discountAmount
  const taxAmount = +(taxable * 0.16).toFixed(2)
  const total = +(taxable + taxAmount).toFixed(2)
  const change = paymentMethod === 'Cash' ? +(cashReceived - total).toFixed(2) : 0

  folioCounter++

  return {
    id: crypto.randomUUID(),
    folio: String(folioCounter).padStart(5, '0'),
    orderId: String(orderIdCounter++),
    issuedAt: new Date().toISOString(),
    cashierName,
    shopName: 'Carnicería Don Memo',
    items: ticketItems,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    cashReceived,
    change,
    paymentMethod: paymentMethod as TicketDto['paymentMethod'],
  }
}

export const MOCK_SESSION: CashierSessionDto = {
  sessionId: crypto.randomUUID(),
  cashierName: '',
  openedAt: new Date().toISOString(),
}

export const MOCK_SUMMARY: SessionSummaryDto = {
  sessionId: '',
  cashierName: '',
  openedAt: new Date().toISOString(),
  closedAt: null,
  totalOrders: 14,
  totalSales: 4820,
  totalCash: 3140,
  totalCard: 1200,
  totalTransfer: 480,
  totalDiscounts: 230,
  openingCash: 500,
  expectedCash: 3640,
}

export let MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Juan Pérez',    phone: '33 1234 5678', email: '',                discountPercent: 10 },
  { id: '2', name: 'Restaurante El Fogón', phone: '33 8765 4321', email: 'compras@elfogon.com', discountPercent: 15 },
  { id: '3', name: 'María López',   phone: '33 5555 1234', email: '',                discountPercent: 5  },
]

export const MOCK_DASHBOARD = {
  totalSales: 4820, totalOrders: 47, averageTicket: 102.55, totalDiscounts: 230,
  totalCash: 3140, totalCard: 1200, totalTransfer: 480,
  salesByDay: [
    { date: '2026-03-10', total: 620, orderCount: 6 },
    { date: '2026-03-11', total: 890, orderCount: 9 },
    { date: '2026-03-12', total: 540, orderCount: 5 },
    { date: '2026-03-13', total: 1100, orderCount: 11 },
    { date: '2026-03-14', total: 760, orderCount: 8 },
    { date: '2026-03-15', total: 910, orderCount: 8 },
  ],
  topProducts: [
    { productName: 'Arrachera',     totalKg: 45.5, totalRevenue: 1274, orderCount: 18 },
    { productName: 'Pechuga',       totalKg: 38.0, totalRevenue: 836,  orderCount: 15 },
    { productName: 'Bistec',        totalKg: 28.5, totalRevenue: 684,  orderCount: 12 },
    { productName: 'Chorizo',       totalKg: 22.0, totalRevenue: 528,  orderCount: 10 },
    { productName: 'Costilla res',  totalKg: 18.0, totalRevenue: 342,  orderCount: 8  },
  ],
  topCustomers: [
    { customerName: 'Restaurante El Fogón', totalSpent: 1840, orderCount: 12, lastPurchase: '2026-03-15T14:30:00Z' },
    { customerName: 'Juan Pérez',           totalSpent: 620,  orderCount: 5,  lastPurchase: '2026-03-14T11:00:00Z' },
    { customerName: 'María López',          totalSpent: 310,  orderCount: 3,  lastPurchase: '2026-03-13T09:15:00Z' },
  ],
  comparison: { currentTotal: 4820, previousTotal: 4100, changePercent: 17.6, currentOrders: 47, previousOrders: 40 },
  from: '2026-03-10T00:00:00Z',
  to: '2026-03-16T23:59:59Z',
}