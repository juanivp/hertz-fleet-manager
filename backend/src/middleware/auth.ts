import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fleet-manager-secret-dev'

export interface AuthRequest extends Request {
  userId?: number
  userRol?: string
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: number; rol: string }
    req.userId = payload.id
    req.userRol = payload.rol
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRol !== 'admin') {
    res.status(403).json({ error: 'Se requiere rol administrador' })
    return
  }
  next()
}

export { JWT_SECRET }
