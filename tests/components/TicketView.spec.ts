import { test, expect } from '@playwright/test'
import { openSession, addProductToCart, setupApiMocks } from '../test-utils'

test.describe('TicketView', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
    await addProductToCart(page, 'Arrachera', '1')
    await page.getByRole('button', { name: 'Cobrar' }).click()
    await page.waitForSelector('text=Confirmar pago')
    await page.getByRole('button', { name: 'Tarjeta' }).click()
    await page.getByRole('button', { name: 'Confirmar cobro' }).click()
    await page.waitForSelector('text=Nueva venta', { timeout: 10000 })
  })

  test('muestra el ticket después del pago', async ({ page }) => {
    await expect(page.getByText('Carnicería Don Memo')).toBeVisible()
  })

  test('muestra el folio', async ({ page }) => {
    await expect(page.getByText(/Folio #/)).toBeVisible()
  })

  test('muestra el producto comprado', async ({ page }) => {
    await expect(page.locator('#ticket-printable').getByText('Arrachera')).toBeVisible()
  })

  test('muestra botón Nueva venta', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Nueva venta' })).toBeVisible()
  })

  test('muestra botón Imprimir ticket', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Imprimir ticket' })).toBeVisible()
  })

  test('Nueva venta limpia el carrito', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva venta' }).click()
    await expect(page.getByText('Sin productos aún')).toBeVisible()
  })
})