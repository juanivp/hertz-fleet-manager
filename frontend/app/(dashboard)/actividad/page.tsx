'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import api, { Actividad } from '@/lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ACCION_TEXTO: Record<string, string> = {
  LOGIN: 'inició sesión',
  CREAR_VEHICULO: 'agregó nuevo vehículo',
  MODIFICAR_VEHICULO: 'actualizó estado de vehículo',
  ELIMINAR_VEHICULO: 'eliminó vehículo',
  CREAR_RESERVA: 'creó nueva reserva para vehículo',
  MODIFICAR_RESERVA: 'modificó reserva',
  ELIMINAR_RESERVA: 'eliminó reserva',
  ENVIAR_ALERTA: 'envió alerta',
  CREAR_USUARIO: 'creó usuario',
  MODIFICAR_USUARIO: 'modificó usuario',
}

export default function ActividadPage() {
  const [limit, setLimit] = useState('50')

  const { data: actividades = [], isLoading } = useQuery<Actividad[]>({
    queryKey: ['actividad', limit],
    queryFn: () => api.get('/actividad', { params: { limit } }).then(r => r.data),
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Registro de Actividad</h1>
        <select
          value={limit}
          onChange={e => setLimit(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="24">Últimas 24 horas</option>
          <option value="50">Última semana</option>
          <option value="100">Último mes</option>
          <option value="200">Todo</option>
        </select>
      </div>

      {/* Activity list */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : actividades.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">Sin registros de actividad</p>
        ) : (
          actividades.map(a => {
            const accionTexto = ACCION_TEXTO[a.accion] || a.accion.replace(/_/g, ' ').toLowerCase()
            const nombre = a.usuario?.nombre || 'Sistema'
            // Extract entity info from detalle for better display
            const detalle = a.detalle.replace(/^[^:]+:\s*/, '')
            return (
              <div key={a.id} className="px-6 py-4">
                <p className="text-xs text-gray-400 mb-1">
                  {format(new Date(a.creadoEn), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-bold">{nombre}</span>{' '}
                  {detalle || `${accionTexto}`}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
