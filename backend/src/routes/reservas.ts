import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { estado, vehiculoId, mes, anio } = req.query
  const where: Record<string, unknown> = {}
  if (estado) where.estado = String(estado)
  if (vehiculoId) where.vehiculoId = Number(vehiculoId)
  if (mes && anio) {
    const inicio = new Date(Number(anio), Number(mes) - 1, 1)
    const fin = new Date(Number(anio), Number(mes), 0, 23, 59, 59)
    where.OR = [{ fechaInicio: { lte: fin }, fechaFin: { gte: inicio } }]
  }
  const reservas = await prisma.reserva.findMany({
    where,
    include: { vehiculo: { select: { id: true, patente: true, modelo: true, marca: true, categoria: true } } },
    orderBy: { fechaInicio: 'desc' },
  })
  res.json(reservas)
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const r = await prisma.reserva.findUnique({
    where: { id: Number(req.params.id) },
    include: { vehiculo: true },
  })
  if (!r) { res.status(404).json({ error: 'Reserva no encontrada' }); return }
  res.json(r)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { vehiculoId, clienteNombre, clienteEmail, clienteTel, fechaInicio, fechaFin, notas } = req.body
  const r = await prisma.reserva.create({
    data: { vehiculoId: Number(vehiculoId), clienteNombre, clienteEmail: clienteEmail || '', clienteTel: clienteTel || '', fechaInicio: new Date(fechaInicio), fechaFin: new Date(fechaFin), notas: notas || '' },
    include: { vehiculo: true },
  })
  await prisma.vehiculo.update({ where: { id: Number(vehiculoId) }, data: { estado: 'reservado' } })
  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'CREAR_RESERVA', detalle: `Reserva creada para ${clienteNombre} - ${r.vehiculo.patente}`, entidad: 'Reserva', entidadId: r.id } })
  res.status(201).json(r)
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { vehiculoId, clienteNombre, clienteEmail, clienteTel, fechaInicio, fechaFin, estado, notas } = req.body

  const prev = await prisma.reserva.findUnique({ where: { id } })
  if (!prev) { res.status(404).json({ error: 'Reserva no encontrada' }); return }

  const newVehiculoId = vehiculoId ? Number(vehiculoId) : prev.vehiculoId

  const r = await prisma.reserva.update({
    where: { id },
    data: { vehiculoId: newVehiculoId, clienteNombre, clienteEmail, clienteTel, fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined, fechaFin: fechaFin ? new Date(fechaFin) : undefined, estado, notas },
    include: { vehiculo: true },
  })

  // When the vehicle changes, update estado of both vehicles (only if reservation is active)
  if (newVehiculoId !== prev.vehiculoId && prev.estado === 'activa') {
    const otraActivaOld = await prisma.reserva.findFirst({ where: { vehiculoId: prev.vehiculoId, estado: 'activa', id: { not: id } } })
    if (!otraActivaOld) {
      await prisma.vehiculo.update({ where: { id: prev.vehiculoId }, data: { estado: 'disponible' } })
    }
    await prisma.vehiculo.update({ where: { id: newVehiculoId }, data: { estado: 'reservado' } })
  }

  if (estado === 'finalizada' || estado === 'cancelada') {
    const otraActiva = await prisma.reserva.findFirst({ where: { vehiculoId: r.vehiculoId, estado: 'activa' } })
    if (!otraActiva) {
      await prisma.vehiculo.update({ where: { id: r.vehiculoId }, data: { estado: 'disponible' } })
    }
  }

  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'MODIFICAR_RESERVA', detalle: `Reserva actualizada: ${r.vehiculo.patente} - ${r.clienteNombre}`, entidad: 'Reserva', entidadId: r.id } })
  res.json(r)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  await prisma.reserva.delete({ where: { id } })
  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'ELIMINAR_RESERVA', detalle: `Reserva eliminada ID ${id}`, entidad: 'Reserva', entidadId: id } })
  res.status(204).send()
})

export default router
