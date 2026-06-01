'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import api, { Vehiculo, Reserva } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  format, startOfDay, eachDayOfInterval,
  parseISO, isWithinInterval, addDays, subDays,
} from 'date-fns'
import { es } from 'date-fns/locale'

const HORAS = [6, 12, 18, 24]
const COLORES_RESERVA: Record<string, string> = {
  activa: 'bg-green-500 text-white',
  finalizada: 'bg-gray-400 text-white',
  cancelada: 'bg-red-400 text-white',
}
const COLORES_PREPAGO = 'bg-blue-500 text-white'

export default function PlanillaPage() {
  const { usuario } = useAuth()
  const canDrag = usuario?.rol === 'admin' || usuario?.rol === 'operador'

  const [fechaInicio, setFechaInicio] = useState(() => subDays(new Date(), 1))
  const [catFilter, setCatFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const qc = useQueryClient()
  const dias = eachDayOfInterval({ start: fechaInicio, end: addDays(fechaInicio, 6) })

  const { data: vehiculos = [], isLoading: loadingV } = useQuery<Vehiculo[]>({
    queryKey: ['vehiculos'],
    queryFn: () => api.get('/vehiculos').then(r => r.data),
  })
  const { data: reservas = [], isLoading: loadingR } = useQuery<Reserva[]>({
    queryKey: ['reservas-planilla'],
    queryFn: () => api.get('/reservas').then(r => r.data),
  })

  const moverReserva = useMutation({
    mutationFn: ({ reservaId, vehiculoId, fechaInicio, fechaFin }: {
      reservaId: number; vehiculoId: number; fechaInicio: string; fechaFin: string
    }) => api.put(`/reservas/${reservaId}`, { vehiculoId, fechaInicio, fechaFin }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas-planilla'] })
      qc.invalidateQueries({ queryKey: ['vehiculos'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const categorias = catFilter === 'todos'
    ? [...new Set(vehiculos.map(v => v.categoria))].sort()
    : [catFilter]

  const vehiculosFiltrados = vehiculos.filter(v => {
    const matchCat = catFilter === 'todos' || v.categoria === catFilter
    const matchSearch = !search || v.patente.toLowerCase().includes(search.toLowerCase()) || v.modelo.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function getReservaDia(vehiculoId: number, dia: Date): Reserva | undefined {
    return reservas.find(r =>
      r.vehiculoId === vehiculoId &&
      isWithinInterval(startOfDay(dia), { start: parseISO(r.fechaInicio), end: parseISO(r.fechaFin) })
    )
  }

  function handleDragStart(e: React.DragEvent, reserva: Reserva) {
    setDraggingId(reserva.id)
    e.dataTransfer.setData('reservaId', reserva.id.toString())
    e.dataTransfer.setData('origFechaInicio', reserva.fechaInicio)
    e.dataTransfer.setData('origFechaFin', reserva.fechaFin)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverCell(null)
  }

  function handleDragOver(e: React.DragEvent, cellKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCell !== cellKey) setDragOverCell(cellKey)
  }

  function handleDrop(e: React.DragEvent, vehiculoId: number, dia: Date, h: number) {
    e.preventDefault()
    setDragOverCell(null)
    setDraggingId(null)

    const reservaId = parseInt(e.dataTransfer.getData('reservaId'))
    const origStart = e.dataTransfer.getData('origFechaInicio')
    const origEnd = e.dataTransfer.getData('origFechaFin')
    if (!reservaId || !origStart || !origEnd) return

    const duration = parseISO(origEnd).getTime() - parseISO(origStart).getTime()

    const newStart = new Date(dia)
    // h=24 means midnight of the next day
    newStart.setHours(h === 24 ? 0 : h, 0, 0, 0)
    if (h === 24) newStart.setDate(newStart.getDate() + 1)
    const newEnd = new Date(newStart.getTime() + duration)

    moverReserva.mutate({
      reservaId,
      vehiculoId,
      fechaInicio: newStart.toISOString(),
      fechaFin: newEnd.toISOString(),
    })
  }

  const loading = loadingV || loadingR

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vista Planilla - Disponibilidad</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vista completa con calendario por horas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">Vista:</span>
            <select className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm">
              <option>Por Hora</option>
              <option>Por Día</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">Mes:</span>
            <select className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm">
              <option>{format(fechaInicio, 'MMMM yyyy', { locale: es })}</option>
            </select>
          </div>
          <button className="rounded-md bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-500 transition-colors">
            Exportar a Excel
          </button>
          <button className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 transition-colors">
            Imprimir
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar patente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Buscar modelo..."
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
          readOnly
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todas las categorías</option>
          {['C', 'H', 'K'].map(c => <option key={c} value={c}>Categoría {c}</option>)}
        </select>
        <select className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm">
          <option>Todos los estados</option>
        </select>
        <div className="ml-auto">
          <button className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
            + Agregar Vehículo
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setFechaInicio(d => subDays(d, 7))}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Anterior
        </button>
        <button
          onClick={() => setFechaInicio(subDays(new Date(), 1))}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Hoy
        </button>
        <button
          onClick={() => setFechaInicio(d => addDays(d, 7))}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Siguiente →
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full border-collapse text-xs" style={{ minWidth: `${240 + dias.length * HORAS.length * 36}px` }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-52 bg-black text-white border-b border-gray-700 px-4 py-2 text-left text-sm font-semibold">
                  Vehículo
                </th>
                {dias.map(dia => (
                  <th
                    key={dia.toISOString()}
                    colSpan={HORAS.length}
                    className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 bg-gray-50"
                  >
                    {format(dia, "EEE dd/MM", { locale: es })}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-10 bg-black border-b border-gray-700" />
                {dias.flatMap(dia =>
                  HORAS.map(h => (
                    <th key={`${dia.toISOString()}-${h}`} className="border-b border-r border-gray-200 px-1 py-1 text-center text-gray-400 font-normal bg-gray-50 w-9">
                      {h}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {categorias.map(cat => {
                const vehiculosCat = vehiculosFiltrados.filter(v => v.categoria === cat)
                if (vehiculosCat.length === 0) return null
                return (
                  <>
                    <tr key={`cat-${cat}`}>
                      <td
                        colSpan={dias.length * HORAS.length + 1}
                        className="sticky left-0 bg-teal-700 px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider"
                      >
                        Categoría {cat}
                      </td>
                    </tr>
                    {vehiculosCat.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-100 px-4 py-2 min-w-[13rem]">
                          <div className="font-mono font-bold text-gray-900 text-xs">{v.patente}</div>
                          <div className="text-gray-400 text-xs">{v.modelo}</div>
                        </td>
                        {dias.flatMap(dia =>
                          HORAS.map(h => {
                            const reservaDia = getReservaDia(v.id, dia)
                            const colorClass = reservaDia
                              ? (reservaDia.clienteNombre.toLowerCase().includes('prepago') ? COLORES_PREPAGO : COLORES_RESERVA[reservaDia.estado] || 'bg-green-500 text-white')
                              : ''
                            const cellKey = `${v.id}-${dia.toISOString()}-${h}`
                            const isOver = dragOverCell === cellKey
                            const isDraggingThis = draggingId === reservaDia?.id

                            return (
                              <td
                                key={cellKey}
                                className={`border-b border-r border-gray-100 p-0 w-9 h-8 transition-colors ${isOver ? 'bg-amber-100 ring-1 ring-inset ring-amber-400' : ''}`}
                                onDragOver={canDrag ? (e) => handleDragOver(e, cellKey) : undefined}
                                onDrop={canDrag ? (e) => handleDrop(e, v.id, dia, h) : undefined}
                              >
                                {reservaDia && h === HORAS[0] ? (
                                  <div
                                    draggable={canDrag}
                                    onDragStart={canDrag ? (e) => handleDragStart(e, reservaDia) : undefined}
                                    onDragEnd={canDrag ? handleDragEnd : undefined}
                                    className={`h-8 flex items-center px-1 text-xs font-medium truncate select-none ${colorClass} ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${isDraggingThis ? 'opacity-40' : ''}`}
                                    title={reservaDia.clienteNombre}
                                  >
                                    {reservaDia.clienteNombre.substring(0, 12)}
                                  </div>
                                ) : reservaDia ? (
                                  <div className={`h-8 ${colorClass} ${isDraggingThis ? 'opacity-40' : 'opacity-80'}`} />
                                ) : (
                                  <div className="h-8" />
                                )}
                              </td>
                            )
                          })
                        )}
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div className="mt-3 flex items-center justify-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-green-500" /> Alquilado
          </span>
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-blue-500" /> Reservado
          </span>
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-gray-300 bg-white" /> Disponible
          </span>
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-amber-100 border border-amber-300" /> Feriado
          </span>
          {canDrag && (
            <span className="text-gray-400 text-xs italic">
              Arrastrá un cliente para mover su reserva
            </span>
          )}
        </div>
      )}
    </div>
  )
}
