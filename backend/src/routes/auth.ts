import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest, JWT_SECRET } from '../middleware/auth'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña requeridos' })
    return
  }
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario || !usuario.activo) {
    res.status(401).json({ error: 'Credenciales inválidas' })
    return
  }
  const ok = await bcrypt.compare(password, usuario.passwordHash)
  if (!ok) {
    res.status(401).json({ error: 'Credenciales inválidas' })
    return
  }
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } })
  await prisma.registroActividad.create({
    data: { usuarioId: usuario.id, accion: 'LOGIN', detalle: 'Inicio de sesión exitoso', entidad: 'Usuario', entidadId: usuario.id },
  })
  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } })
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.userId },
    select: { id: true, nombre: true, email: true, rol: true, ultimoAcceso: true },
  })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
  res.json(usuario)
})

export default router
