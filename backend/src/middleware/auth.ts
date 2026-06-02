import { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { prisma } from '../lib/prisma'

export interface AuthRequest extends Request {
  userId?: number
  userRol?: string
}

// Fetch Supabase public keys once and cache them
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
)

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }

  const token = header.slice(7)

  try {
    const { payload } = await jwtVerify(token, JWKS)
    const authId = payload.sub!

    const usuario = await prisma.usuario.findUnique({ where: { authId } })
    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: 'Usuario no autorizado' })
      return
    }

    req.userId = usuario.id
    req.userRol = usuario.rol
    next()
  } catch (err) {
    console.error('[auth] JWT verify failed:', err)
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

export const JWT_SECRET = ''
