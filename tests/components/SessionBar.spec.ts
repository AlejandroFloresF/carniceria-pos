import { test, expect } from '@playwright/test'
import { openSession, setupApiMocks } from '../test-utils'

test.describe('SessionBar', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page, 'María Cajero')
  })

  test('muestra el nombre del cajero', async ({ page }) => {
    await expect(page.getByText('María Cajero')).toBeVisible()
  })

  test('muestra indicador de turno activo', async ({ page }) => {
    await expect(page.getByText(/Turno desde/)).toBeVisible()
  })

  test('muestra contador de ventas en 0 al inicio', async ({ page }) => {
    await expect(page.getByText('0 ventas')).toBeVisible()
  })

  test('muestra botón Cerrar turno', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Cerrar turno' })).toBeVisible()
  })

  test('abre modal de cierre al hacer clic', async ({ page }) => {
    await page.getByRole('button', { name: 'Cerrar turno' }).click()
    await expect(page.getByText('Cerrar turno y guardar')).toBeVisible()
    await expect(page.getByText('Efectivo contado en caja')).toBeVisible()
  })
})