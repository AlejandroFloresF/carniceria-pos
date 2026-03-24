import { test, expect } from '@playwright/test'
import { openSession, setupApiMocks } from '../test-utils'

test.describe('CloseSessionModal', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
    await page.getByRole('button', { name: 'Cerrar turno' }).click()
  })

  test('muestra el modal de cierre', async ({ page }) => {
    await expect(page.getByText('Cerrar turno y guardar')).toBeVisible()
    await expect(page.getByLabel('Efectivo contado en caja')).toBeVisible()
  })

  test('muestra diferencia vs esperado', async ({ page }) => {
    await expect(page.getByText(/Diferencia vs esperado/)).toBeVisible()
  })

  test('muestra Cuadrado cuando coincide el efectivo', async ({ page }) => {
    const expected = await page.getByText(/Diferencia vs esperado \(\$/).textContent()
    const match = expected?.match(/\$(\d+\.?\d*)/)
    if (match) {
      await page.getByLabel('Efectivo contado en caja').fill(match[1])
      await expect(page.getByText('Cuadrado')).toBeVisible()
    }
  })

  test('cierra modal con Cancelar', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Efectivo contado en caja')).not.toBeVisible()
  })

  test('botón cerrar turno habilitado', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Cerrar turno y guardar' })
    ).toBeEnabled()
  })
})