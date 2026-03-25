export type PaymentMethod = 'Cash' | 'Card' | 'Transfer'

export interface Product {
  effectivePrice: number
  id: string
  name: string
  category: string
  pricePerUnit: number
  unit: 'kg' | 'piece'
  stockKg: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface OrderItemDto {
  productId: string
  quantity: number
}

export interface CreateOrderRequest {
  cashierSessionId: string
  items: OrderItemDto[]
  discountPercent: number
  paymentMethod: PaymentMethod
  cashReceived: number
  customerId?: string
  debtNote?: string
  advancePayment?: number
}

export interface TicketItemDto {
  productId:   string
  productName: string
  quantity:    number
  unit:        string
  unitPrice:   number
  total:       number
}

export interface TicketDto {
  id:            string
  folio:         string
  orderId:       string
  issuedAt:      string
  cashierName:   string
  shopName:      string
  customerName:  string      // ← agrega, lo usa TicketView
  items:         TicketItemDto[]
  subtotal:      number
  discountAmount:number
  taxAmount:     number
  total:         number
  cashReceived:  number
  change:        number
  paymentMethod: string      // ← string en lugar de PaymentMethod para incluir PayLater
}

export interface CashierSessionDto {
  sessionId:   string
  cashierName: string
  openedAt:    string
  openingCash: number        // ← agrega, lo necesita OpenSessionModal
}

export interface SessionSummaryDto {
  sessionId:      string
  cashierName:    string
  openedAt:       string
  closedAt:       string | null
  totalOrders:    number
  totalSales:     number
  totalCash:      number
  totalCard:      number
  totalTransfer:  number
  totalDiscounts: number
  openingCash:    number
  expectedCash:   number
}

export interface Customer {
  id:              string
  name:            string
  phone?:          string
  address?:        string
  discountPercent: number
  totalDebt:       number
  color:           string
  emoji?:          string
}

export interface CustomerProductPrice {
  productId:    string
  productName:  string
  generalPrice: number
  customPrice:  number
}

export interface CustomerDebt {
  id:          string
  orderId:     string
  orderFolio:  string
  amount:      number
  status:      'Pending' | 'Paid'
  createdAt:   string
  paidAt:      string | null
  daysPending: number
  note?:       string          // ← tipado como string? en lugar de any
}

export interface CustomerDetail extends Customer {
  totalDebt:    number         // ← sobrescribe el de Customer para que sea reactivo
  pendingDebts: CustomerDebt[]
  customPrices: CustomerProductPrice[]
}

export interface ProductWithPrice {
  id:            string
  name:          string
  category:      string
  pricePerUnit:  number
  generalPrice:  number
  effectivePrice:number
  unit:          'kg' | 'piece'
  stockKg:       number
  hasCustomPrice:boolean
}

export interface DailySales {
  date:       string
  total:      number
  orderCount: number
}

export interface TopProduct {
  productName:  string
  totalKg:      number
  totalRevenue: number
  orderCount:   number
}

export interface TopCustomer {
  customerName: string
  totalSpent:   number
  orderCount:   number
  lastPurchase: string
}

export interface PeriodComparison {
  currentTotal:   number
  previousTotal:  number
  changePercent:  number
  currentOrders:  number
  previousOrders: number
}

export interface DashboardData {
  totalSales:    number
  totalOrders:   number
  averageTicket: number
  totalDiscounts:number
  totalCash:     number
  totalCard:     number
  totalTransfer: number
  // ── métricas nuevas ──────────────────────────────
  totalCreditSales?:         number
  totalPendingDebt?:         number
  maxTicket?:                number
  uniqueCustomers?:          number
  avgItemsPerOrder?:         number
  peakHour?:                 number | null
  bestSellingProductName?:   string | null
  bestSellingProductRevenue?:number
  // ── listas ───────────────────────────────────────
  salesByDay:   DailySales[]
  topProducts:  TopProduct[]
  topCustomers: TopCustomer[]
  comparison:   PeriodComparison
  from:         string
  to:           string
  sessionId?:   string | null
}