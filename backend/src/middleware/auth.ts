import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'
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
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Token inválido' })
    return
  }

  const usuario = await prisma.usuario.findUnique({ where: { authId: user.id } })
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

// kept for backwards compatibility with imports
export const JWT_SECRET = ''
