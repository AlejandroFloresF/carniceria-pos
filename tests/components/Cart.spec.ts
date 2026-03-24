import { test, expect } from '@playwright/test'
import { openSession, addProductToCart, setupApiMocks } from '../test-utils'

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
  })

  test('muestra carrito vacío al inicio', async ({ page }) => {
    await expect(page.getByText('Sin productos aún')).toBeVisible()
  })

  test('agrega un producto al carrito', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    // Busca en el carrito específicamente
    const cartSection = page.locator('.divide-y')
    await expect(cartSection.getByText('Arrachera')).toBeVisible()
  })

  test('muestra el precio correcto en el carrito', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    // El mock tiene precio especial $245 para Arrachera
    const cartSection = page.locator('.divide-y')
    await expect(cartSection.first().getByText(/\$245/)).toBeVisible()
  })

  test('calcula el total con IVA', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    // 245 * 1.16 = 284.20
    const totalSection = page.locator('.border-t.border-gray-100')
    await expect(totalSection.getByText(/\$284/)).toBeVisible()
  })

  test('incrementa cantidad con botón +', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    await page.locator('.divide-y').getByRole('button', { name: '+' }).first().click()
    await expect(page.getByText('1.25kg')).toBeVisible()
  })

  test('reduce cantidad con botón −', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    await page.locator('.divide-y').getByRole('button', { name: '−' }).first().click()
    await expect(page.getByText('0.75kg')).toBeVisible()
  })

  test('elimina producto con quitar', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    await page.getByText('quitar').click()
    await expect(page.getByText('Sin productos aún')).toBeVisible()
  })

  test('limpia el carrito con botón Limpiar', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    await page.getByRole('button', { name: 'Limpiar' }).click()
    await expect(page.getByText('Sin productos aún')).toBeVisible()
  })

  test('aplica descuento al total', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    // Busca el input de descuento por su posición en el formulario
    const discountInput = page.locator('input[type="number"][min="0"][max="100"]')
    await discountInput.fill('10')
    await discountInput.press('Tab')
    // Verifica que el descuento aparece
    await expect(page.getByText(/−\$/)).toBeVisible()
  })

  test('botón Cobrar deshabilitado sin productos', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Cobrar' })).toBeDisabled()
  })

  test('botón Cobrar habilitado con productos', async ({ page }) => {
    await addProductToCart(page, 'Arrachera', '1')
    await expect(page.getByRole('button', { name: 'Cobrar' })).toBeEnabled()
  })
})