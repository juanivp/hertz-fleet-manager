import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

export interface AuthRequest extends Request {
  userId?: number
  userRol?: string
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  const token = header.slice(7)
  let payload: { sub: string }

  try {
    payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub: string }
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' })
    return
  }

  const usuario = await prisma.usuario.findUnique({ where: { authId: payload.sub } })
  if (!usuario || !usuario.activo) {
    res.status(401).json({ error: 'Usuario no autorizado' })
    return
  }

  req.userId = usuario.id
  req.userRol = usuario.rol
  next()
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRol !== 'admin') {
    res.status(403).json({ error: 'Se requiere rol administrador' })
    return
  }
  next()
}

export const JWT_SECRET = ''
