import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { categoria, estado, search } = req.query
  const vehiculos = await prisma.vehiculo.findMany({
    where: {
      ...(categoria ? { categoria: String(categoria) } : {}),
      ...(estado ? { estado: String(estado) } : {}),
      ...(search ? {
        OR: [
          { patente: { contains: String(search) } },
          { modelo: { contains: String(search) } },
          { marca: { contains: String(search) } },
        ],
      } : {}),
    },
    include: {
      reservas: { where: { estado: 'activa' }, orderBy: { fechaInicio: 'desc' }, take: 1 },
      alertas: { where: { leida: false }, take: 3 },
    },
    orderBy: { categoria: 'asc' },
  })
  res.json(vehiculos)
})

router.get('/stats', async (_req, res: Response) => {
  const [total, disponibles, alquilados, reservados, mantenimiento, proximosVenta, alertasActivas] = await Promise.all([
    prisma.vehiculo.count(),
    prisma.vehiculo.count({ where: { estado: 'disponible' } }),
    prisma.vehiculo.count({ where: { estado: 'alquilado' } }),
    prisma.vehiculo.count({ where: { estado: 'reservado' } }),
    prisma.vehiculo.count({ where: { estado: 'mantenimiento' } }),
    prisma.vehiculo.count({ where: { proximaVenta: true } }),
    prisma.alerta.count({ where: { leida: false } }),
  ])
  res.json({ total, disponibles, alquilados, reservados, mantenimiento, proximosVenta, alertasActivas })
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const v = await prisma.vehiculo.findUnique({
    where: { id: Number(req.params.id) },
    include: { reservas: { orderBy: { fechaInicio: 'desc' } }, alertas: { orderBy: { creadoEn: 'desc' } } },
  })
  if (!v) { res.status(404).json({ error: 'Vehículo no encontrado' }); return }
  res.json(v)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { categoria, patente, modelo, marca, anio, estado, ubicacion, kmActuales, proximaVenta, notas } = req.body
  const v = await prisma.vehiculo.create({
    data: { categoria, patente, modelo, marca, anio: Number(anio), estado: estado || 'disponible', ubicacion: ubicacion || '', kmActuales: Number(kmActuales) || 0, proximaVenta: !!proximaVenta, notas: notas || '' },
  })
  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'CREAR_VEHICULO', detalle: `Vehículo agregado: ${marca} ${modelo} ${patente}`, entidad: 'Vehiculo', entidadId: v.id } })
  res.status(201).json(v)
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const prev = await prisma.vehiculo.findUnique({ where: { id } })
  if (!prev) { res.status(404).json({ error: 'Vehículo no encontrado' }); return }
  const { categoria, patente, modelo, marca, anio, estado, ubicacion, kmActuales, proximaVenta, notas } = req.body
  const v = await prisma.vehiculo.update({
    where: { id },
    data: { categoria, patente, modelo, marca, anio: anio ? Number(anio) : undefined, estado, ubicacion, kmActuales: kmActuales ? Number(kmActuales) : undefined, proximaVenta, notas },
  })
  if (prev.estado !== v.estado) {
    await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'MODIFICAR_VEHICULO', detalle: `Estado actualizado: ${v.marca} ${v.modelo} ${v.patente} → ${v.estado}`, entidad: 'Vehiculo', entidadId: v.id } })
  }
  res.json(v)
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  await prisma.alerta.deleteMany({ where: { vehiculoId: id } })
  await prisma.reserva.deleteMany({ where: { vehiculoId: id } })
  await prisma.vehiculo.delete({ where: { id } })
  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'ELIMINAR_VEHICULO', detalle: `Vehículo eliminado ID ${id}`, entidad: 'Vehiculo', entidadId: id } })
  res.status(204).send()
})

export default router
