'use client'

import { useQuery } from '@tanstack/react-query'
import api, { Stats, Alerta } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

function StatCard({ label, value, sub, subColor = 'text-gray-400' }: { label: string; value: number | string; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-4xl font-bold text-gray-900">{value}</p>
      {sub && <p className={`mt-1 text-sm font-medium ${subColor}`}>{sub}</p>}
    </div>
  )
}

const TIPO_BORDER: Record<string, string> = {
  vencimiento: 'border-red-500',
  mantenimiento: 'border-amber-400',
  devolucion: 'border-blue-500',
  cambio_estado: 'border-purple-500',
  otro: 'border-gray-400',
}

export default function DashboardPage() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => api.get('/vehiculos/stats').then(r => r.data),
  })
  const { data: alertas = [] } = useQuery<Alerta[]>({
    queryKey: ['alertas-recientes'],
    queryFn: () => api.get('/alertas').then(r => r.data),
  })

  const tasaOcupacion = stats ? Math.round(((stats.alquilados + stats.reservados) / (stats.total || 1)) * 100) : 0
  const alertasNoLeidas = alertas.filter(a => !a.leida).slice(0, 5)

  return (
    <div className="p-8 space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Flota Total" value={stats?.total || 0} sub="+2 este mes" subColor="text-green-600" />
        <StatCard label="Disponibles" value={stats?.disponibles || 0} />
        <StatCard label="Alquilados" value={stats?.alquilados || 0} sub={`Ocupación: ${tasaOcupacion}%`} subColor="text-green-600" />
        <StatCard label="Reservados" value={stats?.reservados || 0} />
        <StatCard label="Alertas Activas" value={stats?.alertasActivas || 0} />
        <StatCard label="Próximo a Venta" value={stats?.proximosVenta || 0} />
      </div>

      {/* Alertas Recientes */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-gray-900">Alertas Recientes</h2>
        <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {alertasNoLeidas.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">Sin alertas activas</p>
          )}
          {alertasNoLeidas.map(a => (
            <div key={a.id} className={`flex items-start justify-between p-4 border-l-4 ${TIPO_BORDER[a.tipo] || 'border-gray-400'}`}>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{a.descripcion}</p>
                {a.vehiculo && (
                  <p className="mt-0.5 text-sm text-gray-500">
                    {a.vehiculo.marca} {a.vehiculo.modelo}
                    {a.tipo === 'vencimiento' && <span className="text-blue-600"> · 11 meses en renting</span>}
                  </p>
                )}
              </div>
              <span className="ml-6 flex-shrink-0 text-sm text-gray-400">
                {formatDistanceToNow(new Date(a.creadoEn), { addSuffix: true, locale: es })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
