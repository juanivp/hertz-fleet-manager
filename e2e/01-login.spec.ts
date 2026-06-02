import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('redirige a /login si no hay sesión', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('muestra error con credenciales incorrectas', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@flota.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/credenciales|contraseña|error/i')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('login exitoso redirige al dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@flota.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.locator('text=/dashboard/i').first()).toBeVisible()
  })

  test('logout limpia la sesión y redirige a /login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@flota.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    await page.click('text=Cerrar Sesión')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // Verificar que el token fue borrado
    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeNull()
  })

  test('sesión persiste al recargar la página', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@flota.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
  })
})
