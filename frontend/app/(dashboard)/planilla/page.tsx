'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import api, { Vehiculo, Reserva } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { format, eachDayOfInterval, parseISO, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EstadoBadge } from '@/components/ui/badge'

// Columns are labeled by their END hour; each slot covers [h-6, h) of that day.
// h=6 → 00:00-06:00 | h=12 → 06:00-12:00 | h=18 → 12:00-18:00 | h=24 → 18:00-24:00
const HORAS = [6, 12, 18, 24]

function slotRange(dia: Date, h: number): [Date, Date] {
  const start = new Date(dia)
  start.setHours(h - 6, 0, 0, 0)
  const end = new Date(dia)
  // h=24: end is 00:00 of next day
  if (h === 24) { end.setDate(end.getDate() + 1); end.setHours(0, 0, 0, 0) }
  else end.setHours(h, 0, 0, 0)
  return [start, end]
}

function reservaColor(reserva: Reserva, vehiculos: Vehiculo[]): string {
  if (reserva.estado === 'finalizada') return 'bg-gray-400'
  if (reserva.estado === 'cancelada') return 'bg-red-400'
  const vehiculo = vehiculos.find(v => v.id === reserva.vehiculoId)
  if (vehiculo?.estado === 'reservado') return 'bg-blue-500'
  return 'bg-green-600'
}

export default function PlanillaPage() {
  const { usuario } = useAuth()
  const canDrag = usuario?.rol === 'admin' || usuario?.rol === 'operador'

  const [fechaInicio, setFechaInicio] = useState(() => subDays(new Date(), 1))
  const [catFilter, setCatFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null)
  const [editedNotas, setEditedNotas] = useState('')

  const qc = useQueryClient()
  const dias = eachDayOfInterval({ start: fechaInicio, end: addDays(fechaInicio, 6) })
  const totalCols = dias.length * HORAS.length

  const { data: vehiculos = [], isLoading: loadingV } = useQuery<Vehiculo[]>({
    queryKey: ['vehiculos'],
    queryFn: () => api.get('/vehiculos').then(r => r.data),
  })
  const { data: reservas = [], isLoading: loadingR } = useQuery<Reserva[]>({
    queryKey: ['reservas-planilla'],
    queryFn: () => api.get('/reservas').then(r => r.data),
  })

  const saveNotas = useMutation({
    mutationFn: ({ id, notas }: { id: number; notas: string }) =>
      api.put(`/reservas/${id}`, { notas }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas-planilla'] })
      setSelectedReserva(null)
    },
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

  function reservaEnSlot(vehiculoId: number, dia: Date, h: number): Reserva | undefined {
    const [s, e] = slotRange(dia, h)
    return reservas.find(r =>
      r.vehiculoId === vehiculoId &&
      parseISO(r.fechaInicio).getTime() < e.getTime() &&
      parseISO(r.fechaFin).getTime() > s.getTime()
    )
  }

  // How many consecutive slots from fromIdx are covered by this reservation
  function calcColspan(reserva: Reserva, fromIdx: number): number {
    let count = 0
    for (let i = fromIdx; i < totalCols; i++) {
      const [s, e] = slotRange(dias[Math.floor(i / HORAS.length)], HORAS[i % HORAS.length])
      if (parseISO(reserva.fechaInicio).getTime() < e.getTime() && parseISO(reserva.fechaFin).getTime() > s.getTime()) count++
      else break
    }
    return Math.max(count, 1)
  }

  function handleDragStart(e: React.DragEvent, reserva: Reserva, fromIdx: number) {
    setDraggingId(reserva.id)
    e.dataTransfer.setData('reservaId', reserva.id.toString())
    e.dataTransfer.setData('origFechaInicio', reserva.fechaInicio)
    e.dataTransfer.setData('origFechaFin', reserva.fechaFin)
    e.dataTransfer.setData('fromIdx', fromIdx.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverCell(null)
  }

  // Offset-based drop: shift both fechaInicio and fechaFin by the same number of slots.
  // This preserves the visual block width regardless of whether the reservation
  // starts before the visible range.
  function handleDrop(e: React.DragEvent, vehiculoId: number, toIdx: number) {
    e.preventDefault()
    setDragOverCell(null)
    setDraggingId(null)
    const reservaId = parseInt(e.dataTransfer.getData('reservaId'))
    const origStart = e.dataTransfer.getData('origFechaInicio')
    const origEnd = e.dataTransfer.getData('origFechaFin')
    const fromIdx = parseInt(e.dataTransfer.getData('fromIdx'))
    if (!reservaId || !origStart || !origEnd || isNaN(fromIdx)) return
    const SLOT_MS = 6 * 60 * 60 * 1000
    const offsetMs = (toIdx - fromIdx) * SLOT_MS
    const newFechaInicio = new Date(parseISO(origStart).getTime() + offsetMs)
    const newFechaFin = new Date(parseISO(origEnd).getTime() + offsetMs)
    moverReserva.mutate({ reservaId, vehiculoId, fechaInicio: newFechaInicio.toISOString(), fechaFin: newFechaFin.toISOString() })
  }

  const categorias = catFilter === 'todos'
    ? [...new Set(vehiculos.map(v => v.categoria))].sort()
    : [catFilter]

  const vehiculosFiltrados = vehiculos.filter(v => {
    const matchCat = catFilter === 'todos' || v.categoria === catFilter
    const matchSearch = !search || v.patente.toLowerCase().includes(search.toLowerCase()) || v.modelo.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

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
        <button disabled={!!draggingId} onClick={() => setFechaInicio(d => subDays(d, 7))} className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
        <button disabled={!!draggingId} onClick={() => setFechaInicio(subDays(new Date(), 1))} className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Hoy</button>
        <button disabled={!!draggingId} onClick={() => setFechaInicio(d => addDays(d, 7))} className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Siguiente →</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full border-collapse text-xs" style={{ minWidth: `${240 + totalCols * 36}px` }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-52 bg-black text-white border-b border-gray-700 px-4 py-2 text-left text-sm font-semibold">
                  Vehículo
                </th>
                {dias.map(dia => (
                  <th key={dia.toISOString()} colSpan={HORAS.length} className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 bg-gray-50">
                    {format(dia, 'EEE dd/MM', { locale: es })}
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
                      <td colSpan={totalCols + 1} className="sticky left-0 bg-teal-700 px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider">
                        Categoría {cat}
                      </td>
                    </tr>
                    {vehiculosCat.map(v => {
                      const cells: React.ReactNode[] = []
                      let i = 0
                      while (i < totalCols) {
                        const dia = dias[Math.floor(i / HORAS.length)]
                        const h = HORAS[i % HORAS.length]
                        const reserva = reservaEnSlot(v.id, dia, h)

                        if (reserva) {
                          const span = calcColspan(reserva, i)
                          const isDragging = draggingId === reserva.id
                          const color = reservaColor(reserva, vehiculos)
                          cells.push(
                            <td key={`${v.id}-r${reserva.id}-${i}`} colSpan={span} className="border-b border-r border-gray-100 p-0.5 h-8">
                              <div
                                draggable={canDrag && reserva.estado === 'activa'}
                                onDragStart={canDrag && reserva.estado === 'activa' ? e => handleDragStart(e, reserva, i) : undefined}
                                onDragEnd={canDrag && reserva.estado === 'activa' ? handleDragEnd : undefined}
                                onClick={() => { setSelectedReserva(reserva); setEditedNotas(reserva.notas || '') }}
                                className={`h-full flex items-center px-2 text-xs font-semibold text-white rounded truncate select-none ${color} ${canDrag && reserva.estado === 'activa' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDragging ? 'opacity-40' : ''}`}
                                title={`${reserva.clienteNombre} - #${reserva.id}`}
                              >
                                {reserva.clienteNombre} - #{reserva.id}
                              </div>
                            </td>
                          )
                          i += span
                        } else {
                          const cellKey = `${v.id}-e${i}`
                          const isOver = dragOverCell === cellKey
                          cells.push(
                            <td
                              key={cellKey}
                              className={`border-b border-r border-gray-100 p-0 w-9 h-8 ${isOver ? 'bg-amber-100 ring-1 ring-inset ring-amber-400' : ''}`}
                              onDragOver={canDrag ? e => { e.preventDefault(); if (dragOverCell !== cellKey) setDragOverCell(cellKey) } : undefined}
                              onDrop={canDrag ? e => handleDrop(e, v.id, i) : undefined}
                            />
                          )
                          i++
                        }
                      }

                      return (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-100 px-4 py-2 min-w-[13rem]">
                            <div className="font-mono font-bold text-gray-900 text-xs">{v.patente}</div>
                            <div className="text-gray-400 text-xs">{v.modelo}</div>
                          </td>
                          {cells}
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reservation detail modal */}
      <Dialog open={!!selectedReserva} onOpenChange={open => !open && setSelectedReserva(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles de la Reserva</DialogTitle>
          </DialogHeader>
          {selectedReserva && (() => {
            const vehiculo = vehiculos.find(v => v.id === selectedReserva.vehiculoId)
            return (
              <div className="space-y-5 pt-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Vehículo</p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                      {selectedReserva.vehiculo?.patente ?? vehiculo?.patente ?? '—'}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Cliente</p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                      {selectedReserva.clienteNombre}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Número de Contrato</p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-800">
                      #{String(selectedReserva.id).padStart(5, '0')}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha/Hora Inicio</p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                      {format(parseISO(selectedReserva.fechaInicio), 'dd/MM/yy HH:mm')}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha/Hora Fin</p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
                      {format(parseISO(selectedReserva.fechaFin), 'dd/MM/yy HH:mm')}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</p>
                    <div className="flex min-h-[38px] items-center rounded-md border border-gray-200 bg-white px-3 py-2">
                      <EstadoBadge estado={vehiculo?.estado ?? selectedReserva.estado} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-800">Observaciones</p>
                  <textarea
                    value={editedNotas}
                    onChange={e => setEditedNotas(e.target.value)}
                    placeholder="Agregar notas..."
                    className="min-h-[80px] w-full resize-y rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                {saveNotas.isError && <p className="text-sm text-red-600">Error al guardar</p>}
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    onClick={() => setSelectedReserva(null)}
                    className="rounded-md border border-gray-200 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => saveNotas.mutate({ id: selectedReserva.id, notas: editedNotas })}
                    disabled={saveNotas.isPending}
                    className="flex items-center gap-2 rounded-md bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saveNotas.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Guardar Cambios
                  </button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Legend */}
      {!loading && (
        <div className="mt-3 flex items-center justify-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-green-600" /> Alquilado</span>
          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-blue-500" /> Reservado</span>
          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-gray-300 bg-white" /> Disponible</span>
          <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-amber-100 border border-amber-300" /> Feriado</span>
          {canDrag && <span className="text-gray-400 text-xs italic">Arrastrá un cliente para mover su reserva</span>}
        </div>
      )}
    </div>
  )
}
