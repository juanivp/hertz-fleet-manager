import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { supabaseAdmin } from '../lib/supabase'
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
  if (!nombre || !email || !password) { res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' }); return }

  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) { res.status(409).json({ error: 'El email ya está en uso' }); return }

  // Create in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nombre },
  })
  if (authError) { res.status(400).json({ error: authError.message }); return }

  const u = await prisma.usuario.create({
    data: { authId: authData.user!.id, nombre, email, rol: rol || 'operador' },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
  })
  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'CREAR_USUARIO', detalle: `Usuario creado: ${nombre} (${rol})`, entidad: 'Usuario', entidadId: u.id } })
  res.status(201).json(u)
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { nombre, email, rol, activo, password } = req.body

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }

  // Update password in Supabase Auth if provided
  if (password && usuario.authId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(usuario.authId, { password })
    if (error) { res.status(400).json({ error: error.message }); return }
  }

  const u = await prisma.usuario.update({
    where: { id },
    data: { nombre, email, rol, activo },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, ultimoAcceso: true },
  })
  await prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: 'MODIFICAR_USUARIO', detalle: `Usuario actualizado: ${u.nombre}`, entidad: 'Usuario', entidadId: u.id } })
  res.json(u)
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  if (id === req.userId) { res.status(400).json({ error: 'No puedes eliminar tu propio usuario' }); return }

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }

  if (usuario.authId) {
    await supabaseAdmin.auth.admin.deleteUser(usuario.authId)
  }
  await prisma.usuario.delete({ where: { id } })
  res.status(204).send()
})

export default router
