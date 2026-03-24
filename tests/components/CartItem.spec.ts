import { test, expect } from '@playwright/test'
import { openSession, addProductToCart, setupApiMocks } from '../test-utils'

test.describe('CartItem', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
    await addProductToCart(page, 'Arrachera', '2')
  })

  test('muestra nombre y precio por kg', async ({ page }) => {
    const cartItem = page.locator('.divide-y').first()
    await expect(cartItem.getByText('Arrachera')).toBeVisible()
    // El mock tiene precio especial $245
    await expect(cartItem.getByText(/\$245\.00\/kg/)).toBeVisible()
  })

  test('muestra total de línea correcto', async ({ page }) => {
    // 245 * 2 = 490
    const cartItem = page.locator('.divide-y').first()
    await expect(cartItem.getByText(/\$490/)).toBeVisible()
  })

  test('actualiza total al cambiar cantidad', async ({ page }) => {
    await page.locator('.divide-y').getByRole('button', { name: '+' }).first().click()
    // 245 * 2.25 = 551.25
    const cartItem = page.locator('.divide-y').first()
    await expect(cartItem.getByText(/\$551/)).toBeVisible()
  })
})