import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await page.goto('/alertas')
  await page.waitForLoadState('networkidle')
})

test.describe('Alertas', () => {
  test('muestra página de alertas con secciones', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sistema de Alertas' })).toBeVisible()
    await expect(page.locator('text=Alertas Configuradas')).toBeVisible()
    await expect(page.locator('text=ALERTAS ACTIVAS')).toBeVisible()
  })

  test('muestra KPIs de alertas', async ({ page }) => {
    await expect(page.locator('text=ALERTAS ACTIVAS')).toBeVisible()
    await expect(page.locator('text=NOTIFICACIONES ENVIADAS')).toBeVisible()
    await expect(page.locator('text=USUARIOS SUSCRITOS')).toBeVisible()
  })

  test('abre modal de nueva configuración de alerta', async ({ page }) => {
    await page.getByRole('button', { name: /configurar nueva alerta/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog.getByText(/configurar nueva alerta/i)).toBeVisible()
  })

  test('modal de alerta tiene los campos requeridos', async ({ page }) => {
    await page.getByRole('button', { name: /configurar nueva alerta/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog.getByText(/tipo de alerta/i)).toBeVisible()
    await expect(dialog.getByText(/frecuencia/i)).toBeVisible()
    await expect(dialog.getByText(/canal de notificación/i)).toBeVisible()
    await expect(dialog.getByText(/usuarios que recibirán/i)).toBeVisible()
  })

  test('botón Crear deshabilitado sin tipo ni destinatarios', async ({ page }) => {
    await page.getByRole('button', { name: /configurar nueva alerta/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog.getByRole('button', { name: /crear alerta/i })).toBeDisabled()
  })

  test('crea una nueva configuración de alerta', async ({ page }) => {
    await page.getByRole('button', { name: /configurar nueva alerta/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Seleccionar tipo via Radix Select (el trigger abre un listbox portal)
    await dialog.locator('[role="combobox"]').first().click()
    await page.locator('[role="option"]').first().click()

    // Marcar el primer usuario (no el checkbox de canal Email)
    await dialog.locator('label').filter({ hasText: 'Admin Usuario' }).locator('input[type="checkbox"]').check()

    await expect(dialog.getByRole('button', { name: /crear alerta/i })).toBeEnabled({ timeout: 2000 })
    await dialog.getByRole('button', { name: /crear alerta/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })

  test('edita una configuración existente', async ({ page }) => {
    const editBtn = page.locator('button', { hasText: 'Editar' }).first()
    if (await editBtn.count() === 0) { test.skip(); return }

    await editBtn.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog.getByRole('button', { name: /guardar cambios/i })).toBeVisible()
    await dialog.getByRole('button', { name: /cancelar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  test('elimina una configuración de alerta via API', async ({ page }) => {
    // Obtener el token y listar configs actuales
    const token = await page.evaluate(() => localStorage.getItem('token'))
    const configs = await page.evaluate(async (tok) => {
      const r = await fetch('http://localhost:3001/api/alertas/config', { headers: { Authorization: `Bearer ${tok}` } })
      return r.json()
    }, token)

    if (!configs.length) { test.skip(); return }

    const idToDelete = configs[0].id
    const countBefore = configs.length

    // Borrar via API directamente
    const delResult = await page.evaluate(async ({ tok, id }) => {
      const r = await fetch(`http://localhost:3001/api/alertas/config/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` }
      })
      return r.status
    }, { tok: token, id: idToDelete })

    expect(delResult).toBe(204)

    // Verificar que ya no está en la API
    const configsAfter = await page.evaluate(async (tok) => {
      const r = await fetch('http://localhost:3001/api/alertas/config', { headers: { Authorization: `Bearer ${tok}` } })
      return r.json()
    }, token)
    expect(configsAfter.length).toBe(countBefore - 1)
    expect(configsAfter.find((c: { id: number }) => c.id === idToDelete)).toBeUndefined()
  })
})
