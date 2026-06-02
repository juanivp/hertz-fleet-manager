import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await page.goto('/flota')
  await page.waitForSelector('table', { timeout: 15000 })
})

test.describe('Gestión de Flota', () => {
  test('muestra listado de vehículos con columnas correctas', async ({ page }) => {
    // La página no tiene h1 — la identificamos por el tab activo y las columnas
    await expect(page.locator('text=Gestión de Flota').first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /patente/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /estado/i })).toBeVisible()
    const filas = page.locator('tbody tr')
    expect(await filas.count()).toBeGreaterThan(0)
  })

  test('filtro de búsqueda por patente', async ({ page }) => {
    const patente = await page.locator('tbody tr td.font-mono').first().textContent()
    expect(patente).toBeTruthy()
    await page.fill('input[placeholder*="patente"]', patente!.trim())
    await page.waitForTimeout(300)
    const filas = page.locator('tbody tr')
    expect(await filas.count()).toBe(1)
    await expect(page.locator(`td.font-mono:text("${patente!.trim()}")`)).toBeVisible()
  })

  test('filtro por estado muestra solo vehículos de ese estado', async ({ page }) => {
    const totalInicial = await page.locator('tbody tr').count()
    const estadoSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Todos los estados' }) })
    await estadoSelect.selectOption('disponible')
    await page.waitForTimeout(300)
    const totalFiltrado = await page.locator('tbody tr').count()
    expect(totalFiltrado).toBeLessThanOrEqual(totalInicial)
    const badges = await page.locator('tbody span', { hasText: 'Disponible' }).count()
    expect(badges).toBe(totalFiltrado)
  })

  test('abre modal de agregar vehículo', async ({ page }) => {
    await page.getByRole('button', { name: /agregar vehículo/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog.getByText(/agregar vehículo/i)).toBeVisible()
    await expect(dialog.locator('input[placeholder="AB123CD"]')).toBeVisible()
  })

  test('crea un nuevo vehículo y aparece en la tabla', async ({ page }) => {
    const patente = `TS${Date.now().toString().slice(-4)}XY`
    await page.getByRole('button', { name: /agregar vehículo/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[placeholder="AB123CD"]').fill(patente)
    await dialog.locator('input[placeholder="Toyota"]').fill('TestMarca')
    await dialog.locator('input[placeholder="Corolla"]').fill('TestModelo')
    await dialog.getByRole('button', { name: /guardar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator(`td.font-mono:text("${patente}")`)).toBeVisible({ timeout: 5000 })
  })

  test('edita un vehículo y guarda', async ({ page }) => {
    await page.locator('tbody tr').first().getByRole('button', { name: /editar/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog.getByText(/editar vehículo/i)).toBeVisible()

    const textarea = dialog.locator('textarea')
    await textarea.fill('Nota e2e test')
    await dialog.getByRole('button', { name: /guardar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })

  test('modal de edición se cierra con Cancelar', async ({ page }) => {
    await page.locator('tbody tr').first().getByRole('button', { name: /editar/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.getByRole('button', { name: /cancelar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  test('muestra badge de estado en cada vehículo', async ({ page }) => {
    const estadosValidos = ['Disponible', 'Alquilado', 'Reservado', 'Mantenimiento', 'Próx. Venta']
    const badgeTexts = await page.locator('tbody tr').first().locator('span').allTextContents()
    const tieneEstado = badgeTexts.some(b => estadosValidos.includes(b.trim()))
    expect(tieneEstado).toBe(true)
  })
})
