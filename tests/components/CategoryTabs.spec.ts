import { test, expect } from '@playwright/test'
import { openSession, setupApiMocks } from '../test-utils'

test.describe('CategoryTabs', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
  })

  test('muestra la tab Todos activa por defecto', async ({ page }) => {
    // Busca específicamente en la barra de categorías
    const tabs = page.locator('.flex.gap-2.flex-wrap')
    const todos = tabs.getByRole('button', { name: 'Todos' })
    await expect(todos).toHaveClass(/bg-indigo/)
  })

  test('muestra categorías de productos', async ({ page }) => {
    const tabs = page.locator('.flex.gap-2.flex-wrap')
    await expect(tabs.getByRole('button', { name: 'Res', exact: true })).toBeVisible()
    await expect(tabs.getByRole('button', { name: 'Pollo', exact: true })).toBeVisible()
    await expect(tabs.getByRole('button', { name: 'Cerdo', exact: true })).toBeVisible()
  })

  test('filtra al cambiar de categoría', async ({ page }) => {
    const tabs = page.locator('.flex.gap-2.flex-wrap')
    await tabs.getByRole('button', { name: 'Res', exact: true }).click()
    await expect(page.locator('.grid').getByText('Arrachera')).toBeVisible()
    await expect(page.locator('.grid').getByText('Pechuga')).not.toBeVisible()
  })

  test('activa la tab seleccionada', async ({ page }) => {
    const tabs = page.locator('.flex.gap-2.flex-wrap')
    await tabs.getByRole('button', { name: 'Pollo', exact: true }).click()
    await expect(tabs.getByRole('button', { name: 'Pollo', exact: true })).toHaveClass(/bg-indigo/)
  })
})