'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { EstadoBadge } from '@/components/ui/badge'
import api from '@/lib/api'

const REPORTES = [
  { id: 'ocupacion', titulo: 'Reporte de Ocupación', desc: 'Análisis de ocupación de flota por período, categoría y tendencias.', emoji: '📊' },
  { id: 'financiero', titulo: 'Reporte Financiero', desc: 'Ingresos, facturación por cliente, análisis de rentabilidad por vehículo.', emoji: '💰' },
  { id: 'estado', titulo: 'Estado de Flota', desc: 'Resumen completo del estado actual de todos los vehículos.', emoji: '🚗' },
  { id: 'reservas', titulo: 'Próximas Reservas', desc: 'Listado de reservas confirmadas para los próximos 30 días.', emoji: '📅' },
  { id: 'venta', titulo: 'Vehículos Próximos a Venta', desc: 'Listado de vehículos que están por cumplir el tiempo máximo de renting.', emoji: '⚠️' },
  { id: 'mantenimiento', titulo: 'Historial de Mantenimiento', desc: 'Registro completo de mantenimientos realizados y programados.', emoji: '🔧' },
  { id: 'ejecutivo', titulo: 'Reporte Ejecutivo Mensual', desc: 'Resumen ejecutivo con KPIs principales y análisis del mes.', emoji: '📋' },
  { id: 'clientes', titulo: 'Reporte de Clientes', desc: 'Análisis de clientes frecuentes, preferencias y facturación.', emoji: '👥' },
]

function OcupacionReport() {
  const { data, isLoading } = useQuery({ queryKey: ['reporte-ocupacion'], queryFn: () => api.get('/reportes/ocupacion').then(r => r.data) })
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
  if (!data) return null
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: data.total },
          { label: 'Alquilados', value: data.alquilados },
          { label: 'Disponibles', value: data.disponibles },
          { label: 'Ocupación', value: `${data.tasaOcupacion}%` },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Por Categoría</p>
        <div className="space-y-2">
          {data.porCategoria.map((c: { categoria: string; _count: { id: number } }) => (
            <div key={c.categoria} className="flex items-center gap-3">
              <span className="w-16 text-sm text-gray-600">Cat. {c.categoria}</span>
              <div className="flex-1 rounded-full bg-gray-100 h-3">
                <div className="h-3 rounded-full bg-green-500" style={{ width: `${(c._count.id / data.total) * 100}%` }} />
              </div>
              <span className="text-sm text-gray-500">{c._count.id} veh.</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MantenimientoReport() {
  const { data, isLoading } = useQuery({ queryKey: ['reporte-mantenimiento'], queryFn: () => api.get('/reportes/mantenimiento').then(r => r.data) })
  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
  if (!data) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase text-gray-500 bg-gray-50">
            <th className="px-3 py-2">Patente</th><th className="px-3 py-2">Modelo</th><th className="px-3 py-2">KM</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Próx. Venta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.vehiculosMantenimiento.map((v: { patente: string; marca: string; modelo: string; kmActuales: number; estado: string; proximaVenta: boolean }) => (
            <tr key={v.patente} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-mono font-semibold">{v.patente}</td>
              <td className="px-3 py-2 text-gray-600">{v.marca} {v.modelo}</td>
              <td className="px-3 py-2 text-gray-500">{v.kmActuales.toLocaleString()}</td>
              <td className="px-3 py-2"><EstadoBadge estado={v.estado} /></td>
              <td className="px-3 py-2">{v.proximaVenta ? <span className="text-xs text-red-600 font-medium">Sí</span> : '—'}</td>
            </tr>
          ))}
          {data.vehiculosMantenimiento.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Sin vehículos</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportesPage() {
  const [reporteActivo, setReporteActivo] = useState<string | null>(null)

  return (
    <div className="p-8 space-y-8">
      {/* Reporte activo inline */}
      {reporteActivo && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">
              {REPORTES.find(r => r.id === reporteActivo)?.titulo}
            </h2>
            <button onClick={() => setReporteActivo(null)} className="text-sm text-gray-500 hover:text-gray-700">
              Cerrar ✕
            </button>
          </div>
          {reporteActivo === 'ocupacion' && <OcupacionReport />}
          {reporteActivo === 'mantenimiento' && <MantenimientoReport />}
          {!['ocupacion', 'mantenimiento'].includes(reporteActivo) && (
            <p className="text-sm text-gray-400 py-6 text-center">Reporte en construcción</p>
          )}
        </div>
      )}

      {/* Report cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTES.map((r) => (
          <div key={r.id + r.titulo} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-2xl">{r.emoji}</div>
            <h3 className="font-bold text-gray-900 mb-1">{r.titulo}</h3>
            <p className="text-sm text-gray-500 mb-4">{r.desc}</p>
            <button
              onClick={() => setReporteActivo(r.id)}
              className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Generar Reporte
            </button>
          </div>
        ))}
      </div>

      {/* Reportes programados */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-gray-900">Reportes Programados</h2>
        <p className="mb-4 text-sm text-gray-500">Configure reportes automáticos que se enviarán por email periódicamente.</p>
        <button className="rounded-md bg-amber-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-500 transition-colors">
          Programar Nuevo Reporte
        </button>
      </section>
    </div>
  )
}
