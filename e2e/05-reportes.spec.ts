import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await page.goto('/reportes')
  await page.waitForLoadState('networkidle')
})

test.describe('Reportes', () => {
  test('muestra las 8 cards de reportes', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reportes/i }).first()).toBeVisible()
    const cards = page.locator('[class*="rounded-xl"][class*="border"]').filter({ has: page.locator('h3') })
    expect(await cards.count()).toBe(8)
  })

  test('cada card tiene botones PDF, Excel y mail', async ({ page }) => {
    const primeraCard = page.locator('[class*="rounded-xl"][class*="border"]').filter({ has: page.locator('h3') }).first()
    await expect(primeraCard.getByTitle('Descargar PDF')).toBeVisible()
    await expect(primeraCard.getByTitle('Descargar Excel')).toBeVisible()
    await expect(primeraCard.getByTitle('Enviar por mail')).toBeVisible()
  })

  test('descarga PDF de reporte de ocupación', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 })
    const ocupacionCard = page.locator('[class*="rounded-xl"]').filter({ has: page.locator('h3', { hasText: 'Reporte de Ocupación' }) })
    await ocupacionCard.getByTitle('Descargar PDF').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/ocupacion.*\.pdf/)
  })

  test('descarga Excel de reporte de ocupación', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 })
    const ocupacionCard = page.locator('[class*="rounded-xl"]').filter({ has: page.locator('h3', { hasText: 'Reporte de Ocupación' }) })
    await ocupacionCard.getByTitle('Descargar Excel').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/ocupacion.*\.xlsx/)
  })

  test('abre modal de email al clickear el botón mail', async ({ page }) => {
    const primeraCard = page.locator('[class*="rounded-xl"][class*="border"]').filter({ has: page.locator('h3') }).first()
    await primeraCard.getByTitle('Enviar por mail').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog.getByText('Enviar por mail')).toBeVisible()
    await expect(dialog.locator('input[placeholder*="email"]')).toBeVisible()
  })

  test('modal de email tiene selector de formato PDF/Excel', async ({ page }) => {
    const primeraCard = page.locator('[class*="rounded-xl"][class*="border"]').filter({ has: page.locator('h3') }).first()
    await primeraCard.getByTitle('Enviar por mail').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('PDF')).toBeVisible()
    await expect(dialog.getByText('EXCEL')).toBeVisible()
  })

  test('botón Enviar deshabilitado sin destinatarios', async ({ page }) => {
    const primeraCard = page.locator('[class*="rounded-xl"][class*="border"]').filter({ has: page.locator('h3') }).first()
    await primeraCard.getByTitle('Enviar por mail').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: /enviar/i })).toBeDisabled()
  })

  test('envía reporte por email (Ethereal dev)', async ({ page }) => {
    const primeraCard = page.locator('[class*="rounded-xl"][class*="border"]').filter({ has: page.locator('h3') }).first()
    await primeraCard.getByTitle('Enviar por mail').click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[placeholder*="email"]').fill('test@ejemplo.com')
    await dialog.getByRole('button', { name: /^enviar$/i }).click()
    // Debe mostrar mensaje de éxito o link de preview Ethereal
    await expect(dialog.locator('text=/enviado|preview|Ethereal/i').first()).toBeVisible({ timeout: 30000 })
  })

  test('cierra modal de email con Cancelar', async ({ page }) => {
    const primeraCard = page.locator('[class*="rounded-xl"][class*="border"]').filter({ has: page.locator('h3') }).first()
    await primeraCard.getByTitle('Enviar por mail').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.getByRole('button', { name: /cancelar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })
})
