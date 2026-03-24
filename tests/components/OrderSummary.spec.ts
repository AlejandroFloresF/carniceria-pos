import { test, expect } from '@playwright/test'
import { openSession, addProductToCart, setupApiMocks } from '../test-utils'

test.describe('OrderSummary', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
  })

  test('muestra totales en cero al inicio', async ({ page }) => {
    const summary = page.locator('.border-t.border-gray-100')
    await expect(summary.getByText('$0.00').first()).toBeVisible()
  })

  test('calcula subtotal correctamente', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '2')
    // precio especial 245 * 2 = 490
    const summary = page.locator('.border-t.border-gray-100')
    await expect(summary.getByText('$490.00')).toBeVisible()
  })

  test('calcula IVA 16%', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    // 245 * 0.16 = 39.20
    const summary = page.locator('.border-t.border-gray-100')
    await expect(summary.getByText('$39.20')).toBeVisible()
  })

  test('muestra descuento cuando se aplica', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    const discountInput = page.locator('input[type="number"][min="0"][max="100"]')
    await discountInput.fill('10')
    await discountInput.press('Tab')
    await expect(page.getByText(/−\$/)).toBeVisible()
  })

  test('no muestra fila de descuento si es 0', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    await expect(page.getByText(/−\$/)).not.toBeVisible()
  })
})