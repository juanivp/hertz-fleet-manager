import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (_req, res: Response) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, email: true, rol: true, activo: true, ultimoAcceso: true, creadoEn: true },
    orderBy: { creadoEn: 'asc' },
  })
  res.json(usuarios)
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { nombre, email, password, rol } = req.body
  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) { res.status(409).json({ error: 'El email ya está en uso' }); return }
  const hash = await bcrypt.hash(password, 10)
  const u = await prisma.usuario.create({
    data: { nombre, email, passwordHash: hash, rol: rol || 'operador' },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
  })
  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'CREAR_USUARIO', detalle: `Usuario creado: ${nombre} (${rol})`, entidad: 'Usuario', entidadId: u.id } })
  res.status(201).json(u)
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { nombre, email, rol, activo, password } = req.body
  const data: Record<string, unknown> = { nombre, email, rol, activo }
  if (password) data.passwordHash = await bcrypt.hash(password, 10)
  const u = await prisma.usuario.update({
    where: { id },
    data,
    select: { id: true, nombre: true, email: true, rol: true, activo: true, ultimoAcceso: true },
  })
  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'MODIFICAR_USUARIO', detalle: `Usuario actualizado: ${u.nombre}`, entidad: 'Usuario', entidadId: u.id } })
  res.json(u)
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  if (Number(req.params.id) === req.userId) { res.status(400).json({ error: 'No puedes eliminar tu propio usuario' }); return }
  await prisma.usuario.delete({ where: { id: Number(req.params.id) } })
  res.status(204).send()
})

export default router
