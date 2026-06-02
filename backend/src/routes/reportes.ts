import { Router, Request, Response } from 'express'
import nodemailer from 'nodemailer'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { getReportData, getReportTitle, generateExcel, generatePdf } from '../lib/reportGenerators'

const router = Router()
router.use(authenticate)

router.get('/ocupacion', async (_req, res: Response) => {
  const [total, alquilados, reservados, disponibles, mantenimiento] = await Promise.all([
    prisma.vehiculo.count(),
    prisma.vehiculo.count({ where: { estado: 'alquilado' } }),
    prisma.vehiculo.count({ where: { estado: 'reservado' } }),
    prisma.vehiculo.count({ where: { estado: 'disponible' } }),
    prisma.vehiculo.count({ where: { estado: 'mantenimiento' } }),
  ])
  const porCategoria = await prisma.vehiculo.groupBy({ by: ['categoria'], _count: { id: true } })
  res.json({ total, alquilados, reservados, disponibles, mantenimiento, porCategoria, tasaOcupacion: total > 0 ? Math.round(((alquilados + reservados) / total) * 100) : 0 })
})

router.get('/reservas', async (_req, res: Response) => {
  const hoy = new Date()
  const hace30 = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const [activas, finalizadas30, canceladas30, porMes] = await Promise.all([
    prisma.reserva.count({ where: { estado: 'activa' } }),
    prisma.reserva.count({ where: { estado: 'finalizada', actualizadoEn: { gte: hace30 } } }),
    prisma.reserva.count({ where: { estado: 'cancelada', actualizadoEn: { gte: hace30 } } }),
    prisma.reserva.findMany({ where: { fechaInicio: { gte: new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1) } }, select: { fechaInicio: true, estado: true } }),
  ])
  res.json({ activas, finalizadas30, canceladas30, porMes })
})

router.get('/mantenimiento', async (_req, res: Response) => {
  const vehiculosMantenimiento = await prisma.vehiculo.findMany({
    where: { OR: [{ estado: 'mantenimiento' }, { proximaVenta: true }] },
    select: { patente: true, modelo: true, marca: true, categoria: true, estado: true, proximaVenta: true, kmActuales: true, fechaIncorporacion: true },
  })
  res.json({ vehiculosMantenimiento })
})

router.get('/ejecutivo', async (_req, res: Response) => {
  const [totalVehiculos, reservasActivas, alertasNoLeidas, totalUsuarios] = await Promise.all([
    prisma.vehiculo.count(),
    prisma.reserva.count({ where: { estado: 'activa' } }),
    prisma.alerta.count({ where: { leida: false } }),
    prisma.usuario.count({ where: { activo: true } }),
  ])
  const porEstado = await prisma.vehiculo.groupBy({ by: ['estado'], _count: { id: true } })
  res.json({ totalVehiculos, reservasActivas, alertasNoLeidas, totalUsuarios, porEstado })
})

router.get('/download/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string
  const formato = (req.query.formato ?? '') as string

  if (!['pdf', 'excel'].includes(formato)) {
    res.status(400).json({ error: 'formato debe ser pdf o excel' })
    return
  }

  const data = await getReportData(id, prisma)

  if (formato === 'excel') {
    const buffer = await generateExcel(id, data)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${id}_${Date.now()}.xlsx"`)
    res.send(buffer)
    return
  }

  const buffer = await generatePdf(id, data)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${id}_${Date.now()}.pdf"`)
  res.send(buffer)
})

router.post('/email/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { formato, destinatarios } = req.body as { formato: string; destinatarios: string[] }

  if (!['pdf', 'excel'].includes(formato)) {
    res.status(400).json({ error: 'formato debe ser pdf o excel' })
    return
  }
  if (!destinatarios?.length) {
    res.status(400).json({ error: 'Debe especificar al menos un destinatario' })
    return
  }

  const data = await getReportData(id, prisma)
  const title = getReportTitle(id)

  let buffer: Buffer
  let filename: string
  let contentType: string

  if (formato === 'excel') {
    buffer = await generateExcel(id, data)
    filename = `${id}.xlsx`
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else {
    buffer = await generatePdf(id, data)
    filename = `${id}.pdf`
    contentType = 'application/pdf'
  }

  const transporter = await createTransporter()
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'Fleet Manager <noreply@fleetmanager.com>',
    to: destinatarios.join(', '),
    subject: `${title} — Fleet Manager`,
    text: `Adjunto encontrará el ${title} generado el ${new Date().toLocaleDateString('es-AR')}.`,
    attachments: [{ filename, content: buffer, contentType }],
  })

  // In dev with Ethereal, log the preview URL
  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) console.log('Email preview:', previewUrl)

  res.json({ ok: true, ...(previewUrl ? { previewUrl } : {}) })
})

async function createTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  // Fallback: Ethereal test account (dev only)
  const testAccount = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
}

export default router
