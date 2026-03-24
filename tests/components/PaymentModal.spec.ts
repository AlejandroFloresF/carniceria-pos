import { test, expect } from '@playwright/test'
import { openSession, addProductToCart, setupApiMocks } from '../test-utils'

test.describe('PaymentModal', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
    await addProductToCart(page, 'Arrachera', '1')
    await page.getByRole('button', { name: 'Cobrar' }).click()
    await page.waitForSelector('text=Confirmar pago')
  })

  test('abre el modal al hacer clic en Cobrar', async ({ page }) => {
    await expect(page.getByText('Confirmar pago')).toBeVisible()
    await expect(page.getByText('Total a cobrar')).toBeVisible()
  })

  test('muestra el total correcto', async ({ page }) => {
    // 245 * 1.16 = 284.20
    await expect(page.locator('.text-3xl').getByText(/\$284/)).toBeVisible()
  })

  test('muestra campo de cantidad recibida en efectivo', async ({ page }) => {
    await expect(page.getByPlaceholder('0.00')).toBeVisible()
  })

  test('calcula cambio correctamente', async ({ page }) => {
    await page.getByPlaceholder('0.00').fill('400')
    await expect(page.getByText('Cambio a entregar')).toBeVisible()
    await expect(page.getByText(/\$115/)).toBeVisible()
  })

  test('muestra error si monto insuficiente', async ({ page }) => {
    await page.getByPlaceholder('0.00').fill('100')
    await expect(page.getByText('Monto insuficiente')).toBeVisible()
  })

  test('deshabilita confirmar si monto insuficiente', async ({ page }) => {
    await page.getByPlaceholder('0.00').fill('100')
    await expect(page.getByRole('button', { name: 'Confirmar cobro' })).toBeDisabled()
  })

  test('PayLater deshabilitado sin cliente registrado', async ({ page }) => {
    const payLater = page.getByRole('button', { name: 'Pagar después' })
    await expect(payLater).toBeDisabled()
  })

  test('cambia a método Tarjeta', async ({ page }) => {
    await page.getByRole('button', { name: 'Tarjeta' }).click()
    await expect(page.getByPlaceholder('0.00')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar cobro' })).toBeEnabled()
  })

  test('cierra el modal con Cancelar', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Confirmar pago')).not.toBeVisible()
  })

  test('muestra montos sugeridos', async ({ page }) => {
    await expect(page.locator('.flex.gap-2 button').first()).toBeVisible()
  })
})