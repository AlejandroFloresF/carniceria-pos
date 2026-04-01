import { Page } from '@playwright/test'

// ── Data de mock ─────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS = [
  { id: '1', name: 'Arrachera',      category: 'Res',       pricePerUnit: 280, effectivePrice: 280, generalPrice: 280, unit: 'kg', stockKg: 15, hasCustomPrice: false },
  { id: '2', name: 'Costilla res',   category: 'Res',       pricePerUnit: 190, effectivePrice: 190, generalPrice: 190, unit: 'kg', stockKg: 20, hasCustomPrice: false },
  { id: '3', name: 'Milanesa res',   category: 'Res',       pricePerUnit: 210, effectivePrice: 210, generalPrice: 210, unit: 'kg', stockKg: 12, hasCustomPrice: false },
  { id: '4', name: 'Bistec',         category: 'Res',       pricePerUnit: 240, effectivePrice: 240, generalPrice: 240, unit: 'kg', stockKg: 18, hasCustomPrice: false },
  { id: '5', name: 'Chuleta cerdo',  category: 'Cerdo',     pricePerUnit: 160, effectivePrice: 160, generalPrice: 160, unit: 'kg', stockKg: 22, hasCustomPrice: false },
  { id: '6', name: 'Chorizo',        category: 'Embutidos', pricePerUnit: 120, effectivePrice: 120, generalPrice: 120, unit: 'kg', stockKg: 8,  hasCustomPrice: false },
  { id: '7', name: 'Pechuga',        category: 'Pollo',     pricePerUnit: 110, effectivePrice: 110, generalPrice: 110, unit: 'kg', stockKg: 20, hasCustomPrice: false },
  { id: '8', name: 'Muslo/pierna',   category: 'Pollo',     pricePerUnit: 65,  effectivePrice: 65,  generalPrice: 65,  unit: 'kg', stockKg: 25, hasCustomPrice: false },
]

export const MOCK_CUSTOMERS = [
  { id: 'c1', name: 'Público General',      phone: null,           address: null,                    discountPercent: 0,  totalDebt: 0    },
  { id: 'c2', name: 'Juan Pérez',           phone: '33 1234 5678', address: 'Calle Morelos 12',       discountPercent: 10, totalDebt: 0    },
  { id: 'c3', name: 'Restaurante El Fogón', phone: '33 8765 4321', address: 'Av. Vallarta 890',       discountPercent: 15, totalDebt: 1695 },
]

export const MOCK_SESSION = {
  sessionId: 'session-test-001',
  cashierName: 'Test Cajero',
  openedAt: new Date().toISOString(),
}

export const MOCK_TICKET = {
  id: 'ticket-001',
  folio: '00001',
  orderId: 'order-001',
  issuedAt: new Date().toISOString(),
  cashierName: 'Test Cajero',
  shopName: 'Carnicería Don Memo',
  customerName: 'Público General',
  items: [
    { productId: '1', productName: 'Arrachera', quantity: 1, unit: 'kg', unitPrice: 280, total: 280 },
  ],
  subtotal: 280,
  discountAmount: 0,
  taxAmount: 44.80,
  total: 324.80,
  cashReceived: 350,
  change: 25.20,
  paymentMethod: 'Cash',
}

export const MOCK_STOCK_STATUS = MOCK_PRODUCTS.map(p => ({
  productId:           p.id,
  productName:         p.name,
  category:            p.category,
  currentStockKg:      p.stockKg,
  minimumStockKg:      5,
  isBelowMinimum:      p.stockKg < 5,
  totalSoldLast7Days:  Math.round(p.stockKg * 0.3 * 10) / 10,
  totalWasteLast7Days: 0.2,
  averageDailySales:   Math.round(p.stockKg * 0.04 * 100) / 100,
  salePrice:           p.pricePerUnit,
}))

// ── Setup de rutas mock ───────────────────────────────────────────────────────

export async function setupApiMocks(page: Page) {
  // Productos
  await page.route('**/api/products**', async route => {
    const url = route.request().url()
    const customerId = url.match(/with-prices\/([^?]+)/)?.[1]

    if (customerId) {
      // Productos con precio especial por cliente
      const pricesMap: Record<string, number> = { '1': 245, '7': 95 }
      const products = MOCK_PRODUCTS.map(p => ({
        ...p,
        effectivePrice:  pricesMap[p.id] ?? p.pricePerUnit,
        hasCustomPrice: !!pricesMap[p.id],
      }))
      await route.fulfill({ json: products })
    } else {
      const search = new URL(url).searchParams.get('search')?.toLowerCase()
      const filtered = search
        ? MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(search))
        : MOCK_PRODUCTS
      await route.fulfill({ json: filtered })
    }
  })

  // Clientes
  await page.route('**/api/customers**', async route => {
    const method = route.request().method()
    const url    = route.request().url()

    if (method === 'GET' && !url.includes('/')) {
      const search = new URL(url).searchParams.get('search')?.toLowerCase()
      const filtered = search
        ? MOCK_CUSTOMERS.filter(c => c.name.toLowerCase().includes(search))
        : MOCK_CUSTOMERS
      await route.fulfill({ json: filtered })
    } else if (method === 'POST') {
      const body = await route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        json: { id: 'new-customer', ...body, totalDebt: 0 },
      })
    } else if (method === 'PUT') {
      const body = await route.request().postDataJSON()
      await route.fulfill({ status: 200, json: { ...body } })
    } else {
      await route.fulfill({ json: MOCK_CUSTOMERS })
    }
  })

  // Detalle de cliente
  await page.route('**/api/customers/c*', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        json: {
          id: 'c3',
          name: 'Restaurante El Fogón',
          phone: '33 8765 4321',
          address: 'Av. Vallarta 890',
          discountPercent: 15,
          totalDebt: 1695,
          pendingDebts: [
            { id: 'd1', orderId: 'o1', orderFolio: '00010', amount: 1695.15, status: 'Pending', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), paidAt: null, daysPending: 3 },
          ],
          customPrices: [
            { productId: '1', productName: 'Arrachera',   generalPrice: 280, customPrice: 245 },
            { productId: '7', productName: 'Pechuga',     generalPrice: 110, customPrice: 95  },
          ],
        },
      })
    } else {
      await route.fulfill({ status: 200, json: { success: true } })
    }
  })

  // Sesiones
  await page.route('**/api/sessions/open', async route => {
    await route.fulfill({ json: MOCK_SESSION })
  })

  await page.route('**/api/sessions/cashiers', async route => {
    await route.fulfill({ json: ['Ana García', 'Test Cajero'] })
  })

  await page.route('**/api/sessions/**/summary', async route => {
    await route.fulfill({
      json: {
        sessionId:      'session-test-001',
        cashierName:    'Test Cajero',
        openedAt:       new Date().toISOString(),
        closedAt:       null,
        totalOrders:    5,
        totalSales:     1240.50,
        totalCash:      800,
        totalCard:      440.50,
        totalTransfer:  0,
        totalDiscounts: 50,
        openingCash:       500,
        expectedCash:      1300,
        totalDebtPayments: 0,
      },
    })
  })

  await page.route('**/api/sessions/**/close', async route => {
    await route.fulfill({ status: 200, json: { success: true } })
  })

  // Órdenes
  await page.route('**/api/orders', async route => {
    await route.fulfill({ status: 201, json: MOCK_TICKET })
  })

  // Inventario
  await page.route('**/api/inventory/status', async route => {
    await route.fulfill({ json: MOCK_STOCK_STATUS })
  })

  await page.route('**/api/inventory/entries', async route => {
    await route.fulfill({ status: 200, json: { success: true } })
  })

  await page.route('**/api/inventory/waste', async route => {
    await route.fulfill({ status: 200, json: { success: true } })
  })

  await page.route('**/api/inventory/alerts/**', async route => {
    await route.fulfill({ status: 200, json: { success: true } })
  })

  await page.route('**/api/inventory/movements/**', async route => {
    await route.fulfill({
      json: [
        { date: new Date().toISOString(), type: 'Venta',          quantityKg: -1.5, stockAfter: 13.5, reference: null },
        { date: new Date().toISOString(), type: 'Entrada (Ranch)', quantityKg:  20,  stockAfter: 15,   reference: 'Entrada semanal' },
      ],
    })
  })

  // Dashboard
  await page.route('**/api/dashboard**', async route => {
    await route.fulfill({
      json: {
        totalSales:     4820,
        totalOrders:    47,
        averageTicket:  102.55,
        totalDiscounts: 230,
        totalCash:      3140,
        totalCard:      1200,
        totalTransfer:  480,
        salesByDay: [
          { date: '2026-03-14', total: 620,  orderCount: 6 },
          { date: '2026-03-15', total: 890,  orderCount: 9 },
          { date: '2026-03-16', total: 540,  orderCount: 5 },
          { date: '2026-03-17', total: 1100, orderCount: 11 },
          { date: '2026-03-18', total: 760,  orderCount: 8 },
          { date: '2026-03-19', total: 910,  orderCount: 8 },
        ],
        topProducts: [
          { productName: 'Arrachera',    totalKg: 45.5, totalRevenue: 1274, orderCount: 18 },
          { productName: 'Pechuga',      totalKg: 38.0, totalRevenue: 836,  orderCount: 15 },
          { productName: 'Bistec',       totalKg: 28.5, totalRevenue: 684,  orderCount: 12 },
        ],
        topCustomers: [
          { customerName: 'Restaurante El Fogón', totalSpent: 1840, orderCount: 12, lastPurchase: new Date().toISOString() },
          { customerName: 'Juan Pérez',           totalSpent: 620,  orderCount: 5,  lastPurchase: new Date().toISOString() },
        ],
        comparison: {
          currentTotal:   4820,
          previousTotal:  4100,
          changePercent:  17.6,
          currentOrders:  47,
          previousOrders: 40,
        },
        from: new Date(Date.now() - 7 * 86400000).toISOString(),
        to:   new Date().toISOString(),
      },
    })
  })

  // Deudas
  await page.route('**/api/customers/debts/**/pay', async route => {
    await route.fulfill({ status: 200, json: { success: true } })
  })

  // Precios por cliente
  await page.route('**/api/customers/**/prices/**', async route => {
    await route.fulfill({ status: 200, json: { success: true } })
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function openSession(page: Page, cashierName = 'Test Cajero') {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  await page.evaluate(() => {
    try { sessionStorage.clear() } catch (_) {}
  })

  await setupApiMocks(page)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('text=Iniciar turno', { timeout: 10000 })

  // Llena el nombre del cajero
  const cashierInput = page.getByPlaceholder('Ej. Ana García')
  await cashierInput.fill(cashierName)

  // ← Cierra el dropdown de sugerencias presionando Escape
  await cashierInput.press('Escape')
  await page.waitForTimeout(200)

  // ← Hace clic fuera del dropdown para asegurar que se cierra
  await page.locator('h1').click()
  await page.waitForTimeout(200)

  // Ahora el campo de fondo de caja está accesible
  const fondoInput = page.locator('input[type="number"]').first()
  await fondoInput.fill('500')

  // Botón iniciar turno
  await page.getByRole('button', { name: 'Iniciar turno' }).click()

  await page.waitForSelector('text=Punto de venta', { timeout: 10000 })
}

export async function addProductToCart(
  page: Page,
  productName: string,
  qty = '1'
) {
  await page.getByPlaceholder('Buscar producto o escanear código...').fill(productName)
  await page.waitForTimeout(200)
  await page.getByText(productName).first().click()
  await page.waitForSelector('button:has-text("+ Agregar")', { timeout: 5000 })

  const weightInput = page.locator('input[step="0.25"]').last()
  await weightInput.fill(qty)
  await page.getByRole('button', { name: '+ Agregar' }).click()
  await page.waitForSelector('button:has-text("+ Agregar")', {
    state: 'hidden', timeout: 3000,
  }).catch(() => {})
}

export async function completePayment(
  page: Page,
  method: 'Cash' | 'Card' | 'Transfer' = 'Card'
) {
  await page.getByRole('button', { name: 'Cobrar' }).click()
  await page.waitForSelector('text=Confirmar pago', { timeout: 5000 })

  if (method === 'Card') {
    await page.getByRole('button', { name: 'Tarjeta' }).click()
  } else if (method === 'Transfer') {
    await page.getByRole('button', { name: 'Transferencia' }).click()
  } else {
    await page.getByPlaceholder('0.00').fill('400')
  }

  await page.getByRole('button', { name: /Confirmar cobro/ }).click()
  await page.waitForSelector('text=Nueva venta', { timeout: 10000 })
}