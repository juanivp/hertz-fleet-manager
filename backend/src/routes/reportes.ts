import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

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

export default router
