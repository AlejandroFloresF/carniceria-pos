import { test, expect } from '@playwright/test'
import { openSession, setupApiMocks } from '../test-utils'

test.describe('ProductGrid', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await openSession(page)
  })

  test('muestra los productos al cargar', async ({ page }) => {
    const grid = page.locator('.grid')
    await expect(grid.getByText('Arrachera')).toBeVisible()
    await expect(grid.getByText('Pechuga')).toBeVisible()
  })

  test('filtra productos por búsqueda', async ({ page }) => {
    await page.getByPlaceholder('Buscar producto o escanear código...').fill('Arrachera')
    await page.waitForTimeout(300)
    const grid = page.locator('.grid')
    await expect(grid.getByText('Arrachera')).toBeVisible()
    await expect(grid.getByText('Pechuga')).not.toBeVisible()
  })

  test('filtra por categoría', async ({ page }) => {
    const tabs = page.locator('.flex.gap-2.flex-wrap')
    await tabs.getByRole('button', { name: 'Pollo', exact: true }).click()
    const grid = page.locator('.grid')
    await expect(grid.getByText('Pechuga')).toBeVisible()
    await expect(grid.getByText('Arrachera')).not.toBeVisible()
  })

  test('selecciona un producto y muestra WeightInput', async ({ page }) => {
    await page.locator('.grid button').filter({ hasText: 'Arrachera' }).click()
    await expect(page.getByRole('button', { name: '+ Agregar' })).toBeVisible()
  })

  test('muestra todos los productos con Todos', async ({ page }) => {
    const tabs = page.locator('.flex.gap-2.flex-wrap')
    await tabs.getByRole('button', { name: 'Pollo', exact: true }).click()
    await tabs.getByRole('button', { name: 'Todos', exact: true }).click()
    const grid = page.locator('.grid')
    await expect(grid.getByText('Arrachera')).toBeVisible()
    await expect(grid.getByText('Pechuga')).toBeVisible()
  })

  test('muestra precio especial cuando hay cliente', async ({ page }) => {
    // El mock devuelve precio especial $245 para Arrachera
    const grid = page.locator('.grid')
    await expect(grid.getByText('$245.00')).toBeVisible()
    await expect(grid.getByText('precio especial')).toBeVisible()
  })
})