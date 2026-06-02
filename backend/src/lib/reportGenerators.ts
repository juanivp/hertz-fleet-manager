import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { PrismaClient } from '@prisma/client'

const REPORT_TITLES: Record<string, string> = {
  ocupacion: 'Reporte de Ocupación',
  financiero: 'Reporte Financiero',
  estado: 'Estado de Flota',
  reservas: 'Próximas Reservas',
  venta: 'Vehículos Próximos a Venta',
  mantenimiento: 'Historial de Mantenimiento',
  ejecutivo: 'Reporte Ejecutivo Mensual',
  clientes: 'Reporte de Clientes',
}

export function getReportTitle(id: string) {
  return REPORT_TITLES[id] ?? id
}

export async function getReportData(id: string, prisma: PrismaClient) {
  switch (id) {
    case 'ocupacion': {
      const [total, alquilados, reservados, disponibles, mantenimiento] = await Promise.all([
        prisma.vehiculo.count(),
        prisma.vehiculo.count({ where: { estado: 'alquilado' } }),
        prisma.vehiculo.count({ where: { estado: 'reservado' } }),
        prisma.vehiculo.count({ where: { estado: 'disponible' } }),
        prisma.vehiculo.count({ where: { estado: 'mantenimiento' } }),
      ])
      const porCategoria = await prisma.vehiculo.groupBy({ by: ['categoria'], _count: { id: true } })
      return { total, alquilados, reservados, disponibles, mantenimiento, porCategoria, tasaOcupacion: total > 0 ? Math.round(((alquilados + reservados) / total) * 100) : 0 }
    }
    case 'estado': {
      const vehiculos = await prisma.vehiculo.findMany({
        select: { patente: true, marca: true, modelo: true, categoria: true, estado: true, kmActuales: true },
        orderBy: { estado: 'asc' },
      })
      return { vehiculos }
    }
    case 'reservas': {
      const hace30 = new Date(Date.now() - 30 * 24 * 3600 * 1000)
      const [activas, finalizadas30, canceladas30] = await Promise.all([
        prisma.reserva.count({ where: { estado: 'activa' } }),
        prisma.reserva.count({ where: { estado: 'finalizada', actualizadoEn: { gte: hace30 } } }),
        prisma.reserva.count({ where: { estado: 'cancelada', actualizadoEn: { gte: hace30 } } }),
      ])
      const proximas = await prisma.reserva.findMany({
        where: { estado: 'activa', fechaInicio: { gte: new Date() } },
        include: { vehiculo: { select: { patente: true, marca: true, modelo: true } } },
        orderBy: { fechaInicio: 'asc' },
        take: 50,
      })
      return { activas, finalizadas30, canceladas30, proximas }
    }
    case 'venta': {
      const vehiculos = await prisma.vehiculo.findMany({
        where: { proximaVenta: true },
        select: { patente: true, marca: true, modelo: true, categoria: true, estado: true, kmActuales: true, fechaIncorporacion: true },
      })
      return { vehiculos }
    }
    case 'mantenimiento': {
      const vehiculosMantenimiento = await prisma.vehiculo.findMany({
        where: { OR: [{ estado: 'mantenimiento' }, { proximaVenta: true }] },
        select: { patente: true, modelo: true, marca: true, categoria: true, estado: true, proximaVenta: true, kmActuales: true },
      })
      return { vehiculosMantenimiento }
    }
    case 'ejecutivo': {
      const [totalVehiculos, reservasActivas, alertasNoLeidas, totalUsuarios] = await Promise.all([
        prisma.vehiculo.count(),
        prisma.reserva.count({ where: { estado: 'activa' } }),
        prisma.alerta.count({ where: { leida: false } }),
        prisma.usuario.count({ where: { activo: true } }),
      ])
      const porEstado = await prisma.vehiculo.groupBy({ by: ['estado'], _count: { id: true } })
      return { totalVehiculos, reservasActivas, alertasNoLeidas, totalUsuarios, porEstado }
    }
    default:
      return null
  }
}

const BLACK = 'FF000000'
const WHITE = 'FFFFFFFF'
const GRAY_BG = 'FFF9F9F9'

const headerCellStyle: Partial<ExcelJS.Style> = {
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } },
  font: { color: { argb: WHITE }, bold: true, size: 10 },
  alignment: { horizontal: 'center', vertical: 'middle' },
}

function applyHeaderRow(row: ExcelJS.Row) {
  row.height = 22
  row.eachCell(cell => { cell.style = headerCellStyle })
}

function applyDataRow(row: ExcelJS.Row, even: boolean) {
  row.eachCell(cell => {
    cell.style = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? GRAY_BG : WHITE } },
      font: { size: 10 },
      alignment: { vertical: 'middle' },
    }
  })
}

export async function generateExcel(reportId: string, data: any): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Fleet Manager'
  wb.created = new Date()
  const title = getReportTitle(reportId)
  const ws = wb.addWorksheet(title)

  const titleRow = ws.addRow([title])
  titleRow.getCell(1).font = { bold: true, size: 14 }
  ws.addRow([`Generado: ${new Date().toLocaleDateString('es-AR')}`]).getCell(1).font = { color: { argb: 'FF666666' }, size: 9 }
  ws.addRow([])

  switch (reportId) {
    case 'ocupacion': {
      applyHeaderRow(ws.addRow(['Métrica', 'Valor']))
      const kpis = [
        ['Total Vehículos', data.total],
        ['Alquilados', data.alquilados],
        ['Reservados', data.reservados],
        ['Disponibles', data.disponibles],
        ['En Mantenimiento', data.mantenimiento],
        ['Tasa de Ocupación', `${data.tasaOcupacion}%`],
      ]
      kpis.forEach((r, i) => applyDataRow(ws.addRow(r), i % 2 === 0))
      ws.addRow([])
      applyHeaderRow(ws.addRow(['Categoría', 'Cantidad de Vehículos']))
      data.porCategoria.forEach((c: any, i: number) => applyDataRow(ws.addRow([`Cat. ${c.categoria}`, c._count.id]), i % 2 === 0))
      ws.columns = [{ width: 28 }, { width: 18 }]
      break
    }
    case 'estado': {
      applyHeaderRow(ws.addRow(['Patente', 'Marca', 'Modelo', 'Categoría', 'KM Actuales', 'Estado']))
      data.vehiculos.forEach((v: any, i: number) => applyDataRow(ws.addRow([v.patente, v.marca, v.modelo, v.categoria, v.kmActuales, v.estado]), i % 2 === 0))
      ws.columns = [{ width: 12 }, { width: 16 }, { width: 18 }, { width: 12 }, { width: 14 }, { width: 16 }]
      break
    }
    case 'reservas': {
      applyHeaderRow(ws.addRow(['Métrica', 'Valor']))
      ;[
        ['Reservas Activas', data.activas],
        ['Finalizadas (últimos 30 días)', data.finalizadas30],
        ['Canceladas (últimos 30 días)', data.canceladas30],
      ].forEach((r, i) => applyDataRow(ws.addRow(r), i % 2 === 0))
      if (data.proximas.length) {
        ws.addRow([])
        applyHeaderRow(ws.addRow(['Patente', 'Vehículo', 'Fecha Inicio', 'Fecha Fin']))
        data.proximas.forEach((r: any, i: number) =>
          applyDataRow(ws.addRow([r.vehiculo.patente, `${r.vehiculo.marca} ${r.vehiculo.modelo}`, new Date(r.fechaInicio).toLocaleDateString('es-AR'), new Date(r.fechaFin).toLocaleDateString('es-AR')]), i % 2 === 0)
        )
      }
      ws.columns = [{ width: 28 }, { width: 14 }, { width: 18 }, { width: 14 }]
      break
    }
    case 'venta': {
      applyHeaderRow(ws.addRow(['Patente', 'Marca', 'Modelo', 'Categoría', 'KM Actuales', 'Estado', 'Incorporación']))
      data.vehiculos.forEach((v: any, i: number) =>
        applyDataRow(ws.addRow([v.patente, v.marca, v.modelo, v.categoria, v.kmActuales, v.estado, new Date(v.fechaIncorporacion).toLocaleDateString('es-AR')]), i % 2 === 0)
      )
      ws.columns = [{ width: 12 }, { width: 16 }, { width: 18 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 16 }]
      break
    }
    case 'mantenimiento': {
      applyHeaderRow(ws.addRow(['Patente', 'Marca', 'Modelo', 'Categoría', 'KM Actuales', 'Estado', 'Próximo a Venta']))
      data.vehiculosMantenimiento.forEach((v: any, i: number) =>
        applyDataRow(ws.addRow([v.patente, v.marca, v.modelo, v.categoria, v.kmActuales, v.estado, v.proximaVenta ? 'Sí' : 'No']), i % 2 === 0)
      )
      ws.columns = [{ width: 12 }, { width: 16 }, { width: 18 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 16 }]
      break
    }
    case 'ejecutivo': {
      applyHeaderRow(ws.addRow(['Indicador', 'Valor']))
      ;[
        ['Total Vehículos', data.totalVehiculos],
        ['Reservas Activas', data.reservasActivas],
        ['Alertas Sin Leer', data.alertasNoLeidas],
        ['Usuarios Activos', data.totalUsuarios],
      ].forEach((r, i) => applyDataRow(ws.addRow(r), i % 2 === 0))
      ws.addRow([])
      applyHeaderRow(ws.addRow(['Estado', 'Cantidad']))
      data.porEstado.forEach((e: any, i: number) => applyDataRow(ws.addRow([e.estado, e._count.id]), i % 2 === 0))
      ws.columns = [{ width: 28 }, { width: 14 }]
      break
    }
    default: {
      ws.addRow(['Este reporte está en construcción.'])
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}

export function generatePdf(reportId: string, data: any): Promise<Buffer> {
  const title = getReportTitle(reportId)
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Page header
    doc.rect(0, 0, doc.page.width, 60).fill('#000000')
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
      .text(title, 50, 18, { width: doc.page.width - 100 })
    doc.fillColor('#cccccc').fontSize(9).font('Helvetica')
      .text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 50, 42)
    doc.fillColor('#000000')
    doc.y = 80

    switch (reportId) {
      case 'ocupacion': {
        pdfTable(doc, ['Métrica', 'Valor'], [
          ['Total Vehículos', String(data.total)],
          ['Alquilados', String(data.alquilados)],
          ['Reservados', String(data.reservados)],
          ['Disponibles', String(data.disponibles)],
          ['En Mantenimiento', String(data.mantenimiento)],
          ['Tasa de Ocupación', `${data.tasaOcupacion}%`],
        ])
        doc.moveDown()
        doc.fontSize(12).font('Helvetica-Bold').text('Distribución por Categoría')
        doc.moveDown(0.4)
        pdfTable(doc, ['Categoría', 'Vehículos'], data.porCategoria.map((c: any) => [`Cat. ${c.categoria}`, String(c._count.id)]))
        break
      }
      case 'estado': {
        pdfTable(doc, ['Patente', 'Marca/Modelo', 'Categoría', 'KM', 'Estado'],
          data.vehiculos.map((v: any) => [v.patente, `${v.marca} ${v.modelo}`, v.categoria, v.kmActuales.toLocaleString('es-AR'), v.estado])
        )
        break
      }
      case 'reservas': {
        pdfTable(doc, ['Métrica', 'Valor'], [
          ['Reservas Activas', String(data.activas)],
          ['Finalizadas (últimos 30 días)', String(data.finalizadas30)],
          ['Canceladas (últimos 30 días)', String(data.canceladas30)],
        ])
        if (data.proximas.length) {
          doc.moveDown()
          doc.fontSize(12).font('Helvetica-Bold').text('Próximas Reservas')
          doc.moveDown(0.4)
          pdfTable(doc, ['Patente', 'Vehículo', 'Inicio', 'Fin'],
            data.proximas.map((r: any) => [r.vehiculo.patente, `${r.vehiculo.marca} ${r.vehiculo.modelo}`, new Date(r.fechaInicio).toLocaleDateString('es-AR'), new Date(r.fechaFin).toLocaleDateString('es-AR')])
          )
        }
        break
      }
      case 'venta': {
        pdfTable(doc, ['Patente', 'Marca/Modelo', 'Cat.', 'KM', 'Estado'],
          data.vehiculos.map((v: any) => [v.patente, `${v.marca} ${v.modelo}`, v.categoria, v.kmActuales.toLocaleString('es-AR'), v.estado])
        )
        break
      }
      case 'mantenimiento': {
        pdfTable(doc, ['Patente', 'Marca/Modelo', 'Cat.', 'KM', 'Estado', 'Prx. Venta'],
          data.vehiculosMantenimiento.map((v: any) => [v.patente, `${v.marca} ${v.modelo}`, v.categoria, v.kmActuales.toLocaleString('es-AR'), v.estado, v.proximaVenta ? 'Sí' : 'No'])
        )
        break
      }
      case 'ejecutivo': {
        pdfTable(doc, ['Indicador', 'Valor'], [
          ['Total Vehículos', String(data.totalVehiculos)],
          ['Reservas Activas', String(data.reservasActivas)],
          ['Alertas Sin Leer', String(data.alertasNoLeidas)],
          ['Usuarios Activos', String(data.totalUsuarios)],
        ])
        doc.moveDown()
        doc.fontSize(12).font('Helvetica-Bold').text('Distribución por Estado')
        doc.moveDown(0.4)
        pdfTable(doc, ['Estado', 'Cantidad'], data.porEstado.map((e: any) => [e.estado, String(e._count.id)]))
        break
      }
      default: {
        doc.fontSize(12).font('Helvetica').fillColor('#888888').text('Este reporte está en construcción.', { align: 'center' })
      }
    }

    doc.end()
  })
}

function pdfTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]) {
  const pageW = doc.page.width - 100
  const colW = pageW / headers.length
  const rowH = 22
  const startX = 50

  // Header
  const hY = doc.y
  doc.rect(startX, hY, pageW, rowH).fill('#000000')
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
  headers.forEach((h, i) => doc.text(h, startX + i * colW + 5, hY + 7, { width: colW - 10, lineBreak: false }))
  doc.y = hY + rowH

  // Rows
  rows.forEach((row, ri) => {
    if (doc.y + rowH > doc.page.height - 60) {
      doc.addPage()
      doc.y = 50
    }
    const rY = doc.y
    doc.rect(startX, rY, pageW, rowH).fill(ri % 2 === 0 ? '#f5f5f5' : '#ffffff')
    doc.fillColor('#333333').font('Helvetica').fontSize(9)
    row.forEach((cell, i) => doc.text(cell, startX + i * colW + 5, rY + 7, { width: colW - 10, lineBreak: false }))
    doc.rect(startX, rY, pageW, rowH).stroke('#e0e0e0')
    doc.y = rY + rowH
  })

  doc.fillColor('#000000')
  doc.moveDown(0.5)
}
