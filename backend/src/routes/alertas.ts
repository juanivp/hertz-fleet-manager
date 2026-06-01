import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (_req, res: Response) => {
  const alertas = await prisma.alerta.findMany({
    include: { vehiculo: { select: { patente: true, modelo: true, marca: true } } },
    orderBy: { creadoEn: 'desc' },
  })
  res.json(alertas)
})

router.get('/stats', async (_req, res: Response) => {
  const treintaDias = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const [activas, enviadas30] = await Promise.all([
    prisma.alerta.count({ where: { leida: false } }),
    prisma.alerta.count({ where: { enviada: true, creadoEn: { gte: treintaDias } } }),
  ])
  res.json({ activas, enviadas30 })
})

router.put('/:id/leer', async (req: AuthRequest, res: Response) => {
  const a = await prisma.alerta.update({ where: { id: Number(req.params.id) }, data: { leida: true } })
  res.json(a)
})

router.put('/leer-todas', async (_req, res: Response) => {
  await prisma.alerta.updateMany({ where: { leida: false }, data: { leida: true } })
  res.json({ ok: true })
})

// Config de alertas
router.get('/config', async (_req, res: Response) => {
  const configs = await prisma.configAlerta.findMany({ orderBy: { creadoEn: 'asc' } })
  res.json(configs)
})

router.post('/config', async (req: AuthRequest, res: Response) => {
  const { nombre, tipo, frecuencia, horaEnvio, canal, destinatarios, mensajePersonalizado, activa } = req.body
  const c = await prisma.configAlerta.create({
    data: {
      nombre, tipo, frecuencia,
      horaEnvio: horaEnvio || null,
      canal: canal || 'email',
      destinatarios: JSON.stringify(destinatarios || []),
      mensajePersonalizado: mensajePersonalizado || null,
      activa: activa !== false,
    },
  })
  res.status(201).json(c)
})

router.put('/config/:id', async (req: AuthRequest, res: Response) => {
  const { nombre, tipo, frecuencia, horaEnvio, canal, destinatarios, mensajePersonalizado, activa } = req.body
  const c = await prisma.configAlerta.update({
    where: { id: Number(req.params.id) },
    data: {
      nombre, tipo, frecuencia,
      horaEnvio: horaEnvio ?? null,
      canal,
      destinatarios: destinatarios ? JSON.stringify(destinatarios) : undefined,
      mensajePersonalizado: mensajePersonalizado ?? null,
      activa,
    },
  })
  res.json(c)
})

router.delete('/config/:id', async (req: AuthRequest, res: Response) => {
  await prisma.configAlerta.delete({ where: { id: Number(req.params.id) } })
  res.status(204).send()
})

export default router
