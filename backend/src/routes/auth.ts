import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// Returns the authenticated user's profile and updates last access.
// Called by the frontend after a successful Supabase signIn.
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.userId },
    select: { id: true, nombre: true, email: true, rol: true, ultimoAcceso: true },
  })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }

  await prisma.usuario.update({ where: { id: req.userId }, data: { ultimoAcceso: new Date() } })
  await prisma.registroActividad.create({
    data: { usuarioId: req.userId, accion: 'LOGIN', detalle: 'Inicio de sesión exitoso', entidad: 'Usuario', entidadId: req.userId },
  })

  res.json(usuario)
})

export default router
