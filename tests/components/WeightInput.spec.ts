import { test, expect } from '@playwright/test'
import { openSession, setupApiMocks } from '../test-utils'

test.describe('WeightInput', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
    // Clic en el producto dentro del grid específicamente
    await page.locator('.grid button').filter({ hasText: 'Arrachera' }).click()
  })

  test('aparece al seleccionar un producto', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ Agregar' })).toBeVisible()
  })

  test('tiene valor por defecto', async ({ page }) => {
    const weightInput = page.locator('input[step="0.25"]').last()
    await expect(weightInput).toBeVisible()
  })

  test('agrega el producto al carrito', async ({ page }) => {
    await page.getByRole('button', { name: '+ Agregar' }).click()
    const cart = page.locator('.divide-y')
    await expect(cart.getByText('Arrachera')).toBeVisible()
  })

  test('desaparece después de agregar', async ({ page }) => {
    await page.getByRole('button', { name: '+ Agregar' }).click()
    await expect(page.getByRole('button', { name: '+ Agregar' })).not.toBeVisible()
  })

  test('agrega con cantidad personalizada', async ({ page }) => {
    const weightInput = page.locator('input[step="0.25"]').last()
    await weightInput.fill('2.5')
    await page.getByRole('button', { name: '+ Agregar' }).click()
    await expect(page.getByText('2.5kg')).toBeVisible()
  })

  test('agrega al presionar Enter', async ({ page }) => {
    const weightInput = page.locator('input[step="0.25"]').last()
    await weightInput.press('Enter')
    const cart = page.locator('.divide-y')
    await expect(cart.getByText('Arrachera')).toBeVisible()
  })
})