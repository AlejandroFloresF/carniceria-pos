import { http, HttpResponse, delay } from 'msw'
import { MOCK_PRODUCTS, MOCK_SESSION, MOCK_SUMMARY, MOCK_CUSTOMERS, MOCK_DASHBOARD, generateTicket } from './data'
import { Customer } from '@/features/pos/types/pos.types'

// Simulates a realistic network delay
const DELAY = 400

export const handlers = [
  http.get('/api/customers', async ({ request }) => {
  await delay(DELAY)
  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.toLowerCase() ?? ''
  const filtered = MOCK_CUSTOMERS.filter(c =>
    !search || c.name.toLowerCase().includes(search)
  )
  return HttpResponse.json(filtered)
}),

// POST /api/customers
http.post('/api/customers', async ({ request }) => {
  await delay(DELAY)
  const body = await request.json() as Omit<Customer, 'id'>
  const newCustomer: Customer = { id: crypto.randomUUID(), ...body }
  MOCK_CUSTOMERS.push(newCustomer)
  return HttpResponse.json(newCustomer)
}),

// PUT /api/customers/:id
http.put('/api/customers/:id', async ({ request, params }) => {
  await delay(DELAY)
  const body = await request.json() as Omit<Customer, 'id'>
  const idx = MOCK_CUSTOMERS.findIndex(c => c.id === params.id)
  if (idx >= 0) MOCK_CUSTOMERS[idx] = { id: params.id as string, ...body }
  return HttpResponse.json(MOCK_CUSTOMERS[idx])
}),

// GET /api/dashboard
http.get('/api/dashboard', async () => {
  await delay(DELAY)
  return HttpResponse.json(MOCK_DASHBOARD)
}),
  // GET /api/products
  http.get('/api/products', async ({ request }) => {
    await delay(DELAY)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const filtered = search
      ? MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(search))
      : MOCK_PRODUCTS
    return HttpResponse.json(filtered)
  }),

  // POST /api/orders
  http.post('/api/orders', async ({ request }) => {
    await delay(DELAY)
    const body = await request.json() as {
      cashierSessionId: string
      items: { productId: string; quantity: number }[]
      discountPercent: number
      paymentMethod: string
      cashReceived: number
    }

    // Simulate stock validation
    for (const item of body.items) {
      const product = MOCK_PRODUCTS.find(p => p.id === item.productId)
      if (!product) {
        return HttpResponse.json({ error: `Producto ${item.productId} no encontrado` }, { status: 404 })
      }
      if (product.stockKg < item.quantity) {
        return HttpResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 400 })
      }
      // Deduct stock locally so repeated calls reflect it
      product.stockKg = +(product.stockKg - item.quantity).toFixed(3)
    }

    const ticket = generateTicket(
      body.items,
      body.discountPercent,
      body.paymentMethod,
      body.cashReceived,
      'Ana García'
    )

    return HttpResponse.json(ticket, { status: 201 })
  }),

  // POST /api/sessions/open
  http.post('/api/sessions/open', async ({ request }) => {
    await delay(DELAY)
    const body = await request.json() as { cashierName: string; openingCash: number }
    return HttpResponse.json({
      ...MOCK_SESSION,
      sessionId: crypto.randomUUID(),
      cashierName: body.cashierName,
      openedAt: new Date().toISOString(),
    })
  }),

  // POST /api/sessions/:id/close
  http.post('/api/sessions/:id/close', async () => {
    await delay(DELAY)
    return HttpResponse.json({ success: true })
  }),

  // GET /api/sessions/:id/summary
  http.get('/api/sessions/:id/summary', async () => {
    await delay(DELAY)
    return HttpResponse.json(MOCK_SUMMARY)
  }),

  // GET /api/tickets/:id
  http.get('/api/tickets/:id', async ({ params }) => {
    await delay(DELAY)
    return HttpResponse.json({ id: params.id, folio: '00042' })
  }),
]