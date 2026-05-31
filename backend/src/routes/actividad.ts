import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res: Response) => {
  const { entidad, limit = '50' } = req.query
  const actividades = await prisma.registroActividad.findMany({
    where: entidad ? { entidad: String(entidad) } : {},
    include: { usuario: { select: { nombre: true, email: true } } },
    orderBy: { creadoEn: 'desc' },
    take: Number(limit),
  })
  res.json(actividades)
})

export default router
