'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import api, { Reserva, Vehiculo } from '@/lib/api'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday,
  parseISO, isWithinInterval, addMonths, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'

// Feriados nacionales argentinos (mes, día)
const FERIADOS: [number, number][] = [
  [1, 1],   // Año Nuevo
  [3, 24],  // Día de la Memoria
  [4, 2],   // Malvinas
  [5, 1],   // Día del Trabajador
  [5, 25],  // Revolución de Mayo
  [6, 20],  // Belgrano
  [7, 9],   // Independencia
  [8, 17],  // San Martín
  [10, 12], // Diversidad Cultural
  [11, 20], // Soberanía Nacional
  [12, 8],  // Inmaculada Concepción
  [12, 25], // Navidad
]

function esFeriado(fecha: Date): boolean {
  const mes = fecha.getMonth() + 1
  const dia = fecha.getDate()
  return FERIADOS.some(([m, d]) => m === mes && d === dia)
}

export default function CalendarioPage() {
  const [mes, setMes] = useState(new Date())

  const inicio = startOfMonth(mes)
  const fin = endOfMonth(mes)
  const calInicio = startOfWeek(inicio, { weekStartsOn: 1 })
  const calFin = endOfWeek(fin, { weekStartsOn: 1 })
  const dias = eachDayOfInterval({ start: calInicio, end: calFin })

  const { data: reservas = [], isLoading: loadingR } = useQuery<Reserva[]>({
    queryKey: ['reservas', mes.getMonth(), mes.getFullYear()],
    queryFn: () => api.get('/reservas', { params: { mes: mes.getMonth() + 1, anio: mes.getFullYear() } }).then(r => r.data),
  })
  const { data: vehiculos = [] } = useQuery<Vehiculo[]>({
    queryKey: ['vehiculos'],
    queryFn: () => api.get('/vehiculos').then(r => r.data),
  })

  function getReservasDia(dia: Date): Reserva[] {
    return reservas.filter(r =>
      isWithinInterval(dia, { start: parseISO(r.fechaInicio), end: parseISO(r.fechaFin) })
    )
  }

  function colorReserva(r: Reserva): string {
    const vehiculo = vehiculos.find(v => v.id === r.vehiculoId)
    // Reservado: fecha inicio en el futuro o estado del vehículo es 'reservado'
    const esReservado = vehiculo?.estado === 'reservado' || new Date(r.fechaInicio) > new Date()
    return esReservado ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
  }

  function getPatente(vehiculoId: number): string {
    return vehiculos.find(v => v.id === vehiculoId)?.patente || String(vehiculoId)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 capitalize">
          {format(mes, 'MMMM yyyy', { locale: es })}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMes(m => subMonths(m, 1))} className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            ← Anterior
          </button>
          <button onClick={() => setMes(new Date())} className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Hoy
          </button>
          <button onClick={() => setMes(m => addMonths(m, 1))} className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Siguiente →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-5 text-sm text-gray-600">
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-green-500" /> Alquilado</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-blue-500" /> Reservado</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-amber-100 border border-amber-300" /> Feriado</span>
      </div>

      {loadingR ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {dias.map((dia, i) => {
              const diaReservas = getReservasDia(dia)
              const esHoy = isToday(dia)
              const esMesActual = isSameMonth(dia, mes)
              const esFeriadoDia = esFeriado(dia)

              return (
                <div
                  key={i}
                  className={[
                    'min-h-[110px] border-b border-r border-gray-100 p-2',
                    esFeriadoDia && esMesActual ? 'bg-amber-50' : '',
                    !esMesActual ? 'bg-gray-50' : '',
                    esHoy ? 'ring-2 ring-inset ring-amber-400' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className={`mb-1 text-sm font-semibold ${esMesActual ? 'text-gray-800' : 'text-gray-300'}`}>
                    {format(dia, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {diaReservas.slice(0, 3).map(r => (
                      <div
                        key={r.id}
                        className={`rounded px-1.5 py-0.5 text-xs truncate font-medium ${colorReserva(r)}`}
                        title={`${getPatente(r.vehiculoId)} - ${r.clienteNombre}`}
                      >
                        {getPatente(r.vehiculoId)}
                      </div>
                    ))}
                    {diaReservas.length > 3 && (
                      <div className="text-xs text-gray-400 px-1">+{diaReservas.length - 3} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
