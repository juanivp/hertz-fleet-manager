import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
  await page.goto('/planilla')
  await page.waitForSelector('table', { timeout: 15000 })
})

test.describe('Vista Planilla', () => {
  test('muestra tabla con vehículos y reservas', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Vista Planilla/ })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Categoría C' })).toBeVisible()
    const reservas = page.locator('td div[draggable]')
    await expect(reservas.first()).toBeVisible()
    expect(await reservas.count()).toBeGreaterThan(0)
  })

  test('filtro de búsqueda por patente filtra las filas', async ({ page }) => {
    // Tomar la primera patente visible
    const primeraPatente = await page.locator('td .font-mono').first().textContent()
    expect(primeraPatente).toBeTruthy()

    await page.fill('input[placeholder="Buscar patente..."]', primeraPatente!.trim())
    await page.waitForTimeout(300)

    const filas = page.locator('tbody tr').filter({ hasText: primeraPatente!.trim() })
    await expect(filas.first()).toBeVisible()

    // Las demás filas de vehículos no deberían aparecer (solo la que coincide)
    const monoTexts = await page.locator('td .font-mono').allTextContents()
    const sinMatch = monoTexts.filter(t => !t.includes(primeraPatente!.trim()))
    expect(sinMatch.length).toBe(0)
  })

  test('filtro por categoría muestra solo esa categoría', async ({ page }) => {
    // El select de categoría es el que tiene la opción "Todas las categorías"
    const catSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Todas las categorías' }) })
    await catSelect.selectOption('C')
    await page.waitForTimeout(300)
    await expect(page.getByRole('cell', { name: 'Categoría C' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Categoría H' })).not.toBeVisible()
    await expect(page.getByRole('cell', { name: 'Categoría K' })).not.toBeVisible()
  })

  test('navegación Anterior y Siguiente cambia el rango de fechas', async ({ page }) => {
    const fechaInicial = await page.locator('thead th').nth(1).textContent()

    await page.click('text=Siguiente →')
    await page.waitForTimeout(300)
    const fechaSiguiente = await page.locator('thead th').nth(1).textContent()
    expect(fechaSiguiente).not.toBe(fechaInicial)

    await page.click('text=← Anterior')
    await page.waitForTimeout(300)
    await page.click('text=← Anterior')
    await page.waitForTimeout(300)
    const fechaAnterior = await page.locator('thead th').nth(1).textContent()
    expect(fechaAnterior).not.toBe(fechaInicial)

    await page.click('text=Hoy')
    await page.waitForTimeout(300)
    const fechaHoy = await page.locator('thead th').nth(1).textContent()
    expect(fechaHoy).toBe(fechaInicial)
  })

  test('click en reserva activa abre modal de detalle', async ({ page }) => {
    const reservaActiva = page.locator('td div.bg-green-600, td div.bg-blue-500').first()
    await reservaActiva.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(dialog.getByText('Detalles de la Reserva')).toBeVisible()
    await expect(dialog.getByText('VEHÍCULO')).toBeVisible()
    await expect(dialog.getByText('CLIENTE')).toBeVisible()
    await expect(dialog.getByText('NÚMERO DE CONTRATO')).toBeVisible()
    await expect(dialog.getByText('FECHA/HORA INICIO')).toBeVisible()
    await expect(dialog.getByText('FECHA/HORA FIN')).toBeVisible()
    await expect(dialog.getByText('ESTADO')).toBeVisible()
    await expect(dialog.getByText('Observaciones')).toBeVisible()
  })

  test('modal muestra datos correctos de la reserva', async ({ page }) => {
    const reservaDiv = page.locator('td div.bg-green-600, td div.bg-blue-500').first()
    const textoReserva = await reservaDiv.textContent()
    await reservaDiv.click()

    await expect(page.locator('text=Detalles de la Reserva')).toBeVisible({ timeout: 3000 })

    // El número de contrato debe estar en formato #XXXXX
    await expect(page.locator('text=/#\\d{5}/')).toBeVisible()

    // Fechas deben estar en formato dd/MM/yy HH:mm
    const fechaInicio = page.locator('dialog, [role="dialog"]').locator('text=/\\d{2}\\/\\d{2}\\/\\d{2} \\d{2}:\\d{2}/').first()
    await expect(fechaInicio).toBeVisible()

    // El texto del bloque debe aparecer en algún campo del modal (nombre cliente)
    if (textoReserva) {
      const nombre = textoReserva.split(' - #')[0].trim()
      await expect(page.locator(`text=${nombre}`).last()).toBeVisible()
    }
  })

  test('modal se cierra con botón Cerrar', async ({ page }) => {
    await page.locator('td div.bg-green-600, td div.bg-blue-500').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    await dialog.getByRole('button', { name: 'Cerrar' }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  test('click en reserva finalizada (gris) también abre el modal', async ({ page }) => {
    const gris = page.locator('td div.bg-gray-400')
    const count = await gris.count()
    if (count === 0) {
      test.skip()
      return
    }
    await gris.first().click()
    await expect(page.locator('text=Detalles de la Reserva')).toBeVisible({ timeout: 3000 })
  })

  test('reservas finalizadas NO son arrastrables', async ({ page }) => {
    const gris = page.locator('td div.bg-gray-400')
    const count = await gris.count()
    if (count === 0) {
      test.skip()
      return
    }
    const draggable = await gris.first().getAttribute('draggable')
    expect(draggable).toBe('false')
  })

  test('reservas activas SÍ son arrastrables', async ({ page }) => {
    const activa = page.locator('td div.bg-green-600, td div.bg-blue-500').first()
    const draggable = await activa.getAttribute('draggable')
    expect(draggable).toBe('true')
  })

  test('botones de navegación se deshabilitan al iniciar drag', async ({ page }) => {
    // Disparar dragstart nativo sobre una reserva activa
    await page.evaluate(() => {
      const div = document.querySelector('td div.bg-green-600') as HTMLElement
        ?? document.querySelector('td div.bg-blue-500') as HTMLElement
      if (div) div.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }))
    })
    await page.waitForTimeout(200)

    const anterior = page.locator('button', { hasText: '← Anterior' })
    const siguiente = page.locator('button', { hasText: 'Siguiente →' })
    const hoy = page.locator('button', { hasText: 'Hoy' })

    await expect(anterior).toBeDisabled()
    await expect(siguiente).toBeDisabled()
    await expect(hoy).toBeDisabled()
  })
})
