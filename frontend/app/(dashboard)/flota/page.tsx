'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EstadoBadge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import api, { Vehiculo } from '@/lib/api'
import { format, differenceInMonths } from 'date-fns'

const ESTADOS = ['disponible', 'alquilado', 'reservado', 'mantenimiento', 'proximo_venta']
const CATEGORIAS = ['C', 'H', 'K', 'S', 'E']
const UBICACIONES = ['Sucursal Centro', 'Sucursal Norte', 'Sucursal Sur', 'Taller']

function VehiculoForm({ vehiculo, onClose }: { vehiculo?: Vehiculo; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    categoria: vehiculo?.categoria || 'C',
    patente: vehiculo?.patente || '',
    modelo: vehiculo?.modelo || '',
    marca: vehiculo?.marca || '',
    anio: vehiculo?.anio?.toString() || new Date().getFullYear().toString(),
    estado: vehiculo?.estado || 'disponible',
    ubicacion: vehiculo?.ubicacion || 'Sucursal Centro',
    kmActuales: vehiculo?.kmActuales?.toString() || '0',
    proximaVenta: vehiculo?.proximaVenta || false,
    notas: vehiculo?.notas || '',
  })
  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      vehiculo ? api.put(`/vehiculos/${vehiculo.id}`, data) : api.post('/vehiculos', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehiculos'] }); qc.invalidateQueries({ queryKey: ['stats'] }); onClose() },
  })
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm(p => ({ ...p, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Categoría</label>
          <Select value={form.categoria} onValueChange={set('categoria')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Patente</label>
          <Input value={form.patente} onChange={e => set('patente')(e.target.value)} placeholder="AB123CD" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Marca</label>
          <Input value={form.marca} onChange={e => set('marca')(e.target.value)} placeholder="Toyota" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Modelo</label>
          <Input value={form.modelo} onChange={e => set('modelo')(e.target.value)} placeholder="Corolla" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Año</label>
          <Input type="number" value={form.anio} onChange={e => set('anio')(e.target.value)} min="2000" max="2030" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">KM actuales</label>
          <Input type="number" value={form.kmActuales} onChange={e => set('kmActuales')(e.target.value)} min="0" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
          <Select value={form.estado} onValueChange={set('estado')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ESTADOS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Ubicación</label>
          <Select value={form.ubicacion} onValueChange={set('ubicacion')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{UBICACIONES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
        <textarea value={form.notas} onChange={e => set('notas')(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={form.proximaVenta} onChange={e => set('proximaVenta')(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
        Próximo a venta
      </label>
      {mutation.isError && <p className="text-sm text-red-600">Error al guardar. Verificar datos.</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function FlotaPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('todos')
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [modal, setModal] = useState<'nuevo' | 'editar' | null>(null)
  const [selected, setSelected] = useState<Vehiculo | null>(null)

  const { data: vehiculos = [], isLoading } = useQuery<Vehiculo[]>({
    queryKey: ['vehiculos'],
    queryFn: () => api.get('/vehiculos').then(r => r.data),
  })

  const filtered = vehiculos.filter(v => {
    const matchSearch = !search || v.patente.toLowerCase().includes(search.toLowerCase()) || v.modelo.toLowerCase().includes(search.toLowerCase()) || v.marca.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'todos' || v.categoria === catFilter
    const matchEst = estadoFilter === 'todos' || v.estado === estadoFilter
    return matchSearch && matchCat && matchEst
  })

  return (
    <div className="p-8">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-56"
          placeholder="Buscar por patente, modelo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>Categoría {c}</option>)}
        </select>
        <select
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <div className="ml-auto">
          <button
            onClick={() => { setSelected(null); setModal('nuevo') }}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            + Agregar Vehículo
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Patente</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Cliente/Reserva</th>
                  <th className="px-4 py-3">Fecha Inicio</th>
                  <th className="px-4 py-3">Fecha Fin</th>
                  <th className="px-4 py-3">Tiempo en Renting</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Alertas</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(v => {
                  const reserva = v.reservas?.[0]
                  const mesesRenting = differenceInMonths(new Date(), new Date(v.fechaIncorporacion))
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-black text-xs font-bold text-white">{v.categoria}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-800">{v.patente}</td>
                      <td className="px-4 py-3 text-gray-700">{v.modelo}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={v.estado} /></td>
                      <td className="px-4 py-3 text-gray-600">{reserva?.clienteNombre || <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{reserva ? format(new Date(reserva.fechaInicio), 'dd/MM/yyyy') : '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{reserva ? format(new Date(reserva.fechaFin), 'dd/MM/yyyy') : '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{mesesRenting} meses</td>
                      <td className="px-4 py-3">
                        <span className="text-blue-600 hover:underline cursor-pointer text-xs">Ver mapa</span>
                      </td>
                      <td className="px-4 py-3">
                        {(v.alertas?.length || 0) > 0 && <span className="text-amber-500 text-base">⚠</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelected(v); setModal('editar') }}
                          className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No se encontraron vehículos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={modal !== null} onOpenChange={o => !o && setModal(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{modal === 'nuevo' ? 'Agregar Vehículo' : 'Editar Vehículo'}</DialogTitle>
          </DialogHeader>
          {modal !== null && <VehiculoForm vehiculo={selected || undefined} onClose={() => setModal(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
