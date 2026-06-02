import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import vehiculosRouter from './routes/vehiculos'
import reservasRouter from './routes/reservas'
import alertasRouter from './routes/alertas'
import usuariosRouter from './routes/usuarios'
import actividadRouter from './routes/actividad'
import reportesRouter from './routes/reportes'

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',').map(s => s.trim().replace(/\/$/, ''))
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin.replace(/\/$/, '')) ? cb(null, true) : cb(new Error('CORS'))),
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/vehiculos', vehiculosRouter)
app.use('/api/reservas', reservasRouter)
app.use('/api/alertas', alertasRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api/actividad', actividadRouter)
app.use('/api/reportes', reportesRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`))
