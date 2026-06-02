import axios from 'axios'
import { tokenStore } from './tokenStore'

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api' })

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      tokenStore.set(null)
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const ESTADOS_VEHICULO = ['disponible', 'alquilado', 'reservado', 'mantenimiento', 'proximo_venta'] as const
export const CATEGORIAS = ['C', 'H', 'K'] as const

export type EstadoVehiculo = (typeof ESTADOS_VEHICULO)[number]
export type Categoria = (typeof CATEGORIAS)[number]

export interface Vehiculo {
  id: number
  categoria: string
  patente: string
  modelo: string
  marca: string
  anio: number
  estado: string
  ubicacion: string
  kmActuales: number
  fechaIncorporacion: string
  proximaVenta: boolean
  notas: string
  creadoEn: string
  actualizadoEn: string
  reservas?: Reserva[]
  alertas?: Alerta[]
}

export interface Reserva {
  id: number
  vehiculoId: number
  vehiculo?: Vehiculo
  clienteNombre: string
  clienteEmail: string
  clienteTel: string
  fechaInicio: string
  fechaFin: string
  estado: string
  notas: string
  creadoEn: string
  actualizadoEn: string
}

export interface Alerta {
  id: number
  vehiculoId?: number
  vehiculo?: { patente: string; modelo: string; marca: string }
  tipo: string
  descripcion: string
  fecha: string
  leida: boolean
  enviada: boolean
  creadoEn: string
}

export interface ConfigAlerta {
  id: number
  nombre: string
  tipo: string
  frecuencia: string
  horaEnvio?: string | null
  canal: string
  destinatarios: string
  mensajePersonalizado?: string | null
  activa: boolean
}

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
  activo: boolean
  ultimoAcceso?: string
  creadoEn: string
}

export interface Actividad {
  id: number
  usuarioId?: number
  usuario?: { nombre: string; email: string }
  accion: string
  detalle: string
  entidad: string
  entidadId?: number
  creadoEn: string
}

export interface Stats {
  total: number
  disponibles: number
  alquilados: number
  reservados: number
  mantenimiento: number
  proximosVenta: number
  alertasActivas: number
}
