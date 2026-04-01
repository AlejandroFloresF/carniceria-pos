import { test, expect, Page } from '@playwright/test'
import { openSession, setupApiMocks } from '../test-utils'

// ── Helper para mockear el summary con datos específicos ──────────────────────
async function mockSessionSummary(page: Page, overrides: Record<string, unknown>) {
  await page.route('**/api/sessions/**/summary', async route => {
    await route.fulfill({
      json: {
        sessionId:         'session-test-001',
        cashierName:       'Test Cajero',
        openedAt:          new Date().toISOString(),
        closedAt:          null,
        totalOrders:       0,
        totalSales:        0,
        totalCash:         0,
        totalCard:         0,
        totalTransfer:     0,
        totalDiscounts:    0,
        openingCash:       500,
        expectedCash:      500,
        totalDebtPayments: 0,
        ...overrides,
      },
    })
  })
}

async function openCloseModal(page: Page) {
  await page.getByRole('button', { name: 'Cerrar turno' }).click()
  await page.waitForSelector('text=Cerrar turno y guardar', { timeout: 5000 })
}

// ── 1. Apertura de turno ──────────────────────────────────────────────────────

test.describe('Caja: turno sin ventas', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await mockSessionSummary(page, { openingCash: 500, expectedCash: 500, totalCash: 0 })
    await openSession(page)
  })

  test('caja esperada es igual al fondo inicial sin ventas', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$500\.00\)/)).toBeVisible()
  })

  test('sin ventas no muestra cobros de deuda', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText('Cobros de deuda recibidos')).not.toBeVisible()
  })
})

// ── 2. Venta en efectivo ──────────────────────────────────────────────────────

test.describe('Caja: venta en efectivo', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    // 1 kg Arrachera a $280 → total $280 cash → CurrentCash = 500 + 280 = 780
    await mockSessionSummary(page, {
      openingCash:  500,
      totalCash:    280,
      expectedCash: 780,
      totalOrders:  1,
      totalSales:   280,
    })
    await openSession(page)
  })

  test('caja esperada incluye venta en efectivo', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$780\.00\)/)).toBeVisible()
  })

  test('contando 780 muestra Cuadrado', async ({ page }) => {
    await openCloseModal(page)
    await page.getByLabel('Efectivo contado en caja').fill('780')
    await expect(page.getByText('Cuadrado')).toBeVisible()
  })

  test('faltante muestra diferencia negativa en rojo', async ({ page }) => {
    await openCloseModal(page)
    await page.getByLabel('Efectivo contado en caja').fill('700')
    await expect(page.getByText('-$80.00')).toBeVisible()
  })

  test('sobrante muestra diferencia positiva en ámbar', async ({ page }) => {
    await openCloseModal(page)
    await page.getByLabel('Efectivo contado en caja').fill('800')
    await expect(page.getByText('+$20.00')).toBeVisible()
  })
})

// ── 3. Venta con tarjeta ──────────────────────────────────────────────────────

test.describe('Caja: venta con tarjeta', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    // Venta con tarjeta no afecta el efectivo → CurrentCash sigue en 500
    await mockSessionSummary(page, {
      openingCash:  500,
      totalCash:    0,
      totalCard:    280,
      expectedCash: 500,
      totalOrders:  1,
      totalSales:   280,
    })
    await openSession(page)
  })

  test('venta con tarjeta no aumenta la caja en efectivo', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$500\.00\)/)).toBeVisible()
  })

  test('contando 500 sin ventas en cash muestra Cuadrado', async ({ page }) => {
    await openCloseModal(page)
    await page.getByLabel('Efectivo contado en caja').fill('500')
    await expect(page.getByText('Cuadrado')).toBeVisible()
  })
})

// ── 4. PayLater con anticipo en efectivo ──────────────────────────────────────

test.describe('Caja: PayLater con anticipo en efectivo', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    // Orden $348, anticipo $200 en efectivo → CurrentCash = 500 + 200 = 700
    await mockSessionSummary(page, {
      openingCash:  500,
      totalCash:    200,
      expectedCash: 700,
      totalOrders:  1,
      totalSales:   348,
    })
    await openSession(page)
  })

  test('anticipo en efectivo aumenta la caja', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$700\.00\)/)).toBeVisible()
  })

  test('contando 700 muestra Cuadrado', async ({ page }) => {
    await openCloseModal(page)
    await page.getByLabel('Efectivo contado en caja').fill('700')
    await expect(page.getByText('Cuadrado')).toBeVisible()
  })
})

// ── 5. PayLater con anticipo en tarjeta ──────────────────────────────────────

test.describe('Caja: PayLater con anticipo en tarjeta', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    // Anticipo en tarjeta → efectivo no cambia
    await mockSessionSummary(page, {
      openingCash:  500,
      totalCash:    0,
      totalCard:    200,
      expectedCash: 500,
      totalOrders:  1,
      totalSales:   348,
    })
    await openSession(page)
  })

  test('anticipo en tarjeta no aumenta la caja en efectivo', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$500\.00\)/)).toBeVisible()
  })
})

// ── 6. PayLater sin anticipo ──────────────────────────────────────────────────

test.describe('Caja: PayLater sin anticipo', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await mockSessionSummary(page, {
      openingCash:  500,
      totalCash:    0,
      expectedCash: 500,
      totalOrders:  1,
      totalSales:   348,
    })
    await openSession(page)
  })

  test('venta a crédito sin anticipo no toca la caja', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$500\.00\)/)).toBeVisible()
  })
})

// ── 7. Cobro de deuda en efectivo ─────────────────────────────────────────────

test.describe('Caja: cobro de deuda en efectivo', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    // Cobro de deuda $348 en efectivo → CurrentCash = 500 + 348 = 848
    await mockSessionSummary(page, {
      openingCash:       500,
      totalCash:         348,
      expectedCash:      848,
      totalDebtPayments: 348,
    })
    await openSession(page)
  })

  test('cobro de deuda en efectivo aumenta la caja', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$848\.00\)/)).toBeVisible()
  })

  test('muestra línea de cobros de deuda recibidos', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText('Cobros de deuda recibidos')).toBeVisible()
    await expect(page.getByText('$348.00')).toBeVisible()
  })

  test('contando 848 muestra Cuadrado', async ({ page }) => {
    await openCloseModal(page)
    await page.getByLabel('Efectivo contado en caja').fill('848')
    await expect(page.getByText('Cuadrado')).toBeVisible()
  })
})

// ── 8. Cobro de deuda en tarjeta ──────────────────────────────────────────────

test.describe('Caja: cobro de deuda en tarjeta', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    // Cobro en tarjeta no toca el efectivo
    await mockSessionSummary(page, {
      openingCash:       500,
      totalCash:         0,
      totalCard:         348,
      expectedCash:      500,
      totalDebtPayments: 348,
    })
    await openSession(page)
  })

  test('cobro de deuda en tarjeta no aumenta caja en efectivo', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$500\.00\)/)).toBeVisible()
  })

  test('muestra cobros de deuda aunque sean en tarjeta', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText('Cobros de deuda recibidos')).toBeVisible()
  })
})

// ── 9. Escenario mixto ────────────────────────────────────────────────────────

test.describe('Caja: escenario mixto', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    // Fondo: 500
    // Venta cash: 280
    // Anticipo cash: 200
    // Cobro deuda cash: 348
    // Total esperado: 500 + 280 + 200 + 348 = 1328
    await mockSessionSummary(page, {
      openingCash:       500,
      totalCash:         828,   // 280 + 200 + 348
      totalCard:         440,
      expectedCash:      1328,
      totalOrders:       5,
      totalSales:        1600,
      totalDebtPayments: 348,
    })
    await openSession(page)
  })

  test('caja esperada suma fondo + todos los ingresos en efectivo', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText(/Diferencia vs esperado \(\$1328\.00\)/)).toBeVisible()
  })

  test('contando exacto muestra Cuadrado', async ({ page }) => {
    await openCloseModal(page)
    await page.getByLabel('Efectivo contado en caja').fill('1328')
    await expect(page.getByText('Cuadrado')).toBeVisible()
  })

  test('muestra cobros de deuda en el resumen', async ({ page }) => {
    await openCloseModal(page)
    await expect(page.getByText('Cobros de deuda recibidos')).toBeVisible()
  })
})
