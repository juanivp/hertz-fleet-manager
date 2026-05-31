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

app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
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
