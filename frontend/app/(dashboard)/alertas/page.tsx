'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import api, { ConfigAlerta, Alerta } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_LABELS: Record<string, string> = {
  vencimiento: 'Vencimiento',
  mantenimiento: 'Mantenimiento',
  devolucion: 'Devolución',
  cambio_estado: 'Cambio de Estado',
  otro: 'Otro',
}

const TIPO_BORDER: Record<string, string> = {
  vencimiento: 'border-amber-400',
  mantenimiento: 'border-amber-400',
  devolucion: 'border-blue-500',
  cambio_estado: 'border-purple-500',
  otro: 'border-gray-400',
}

function ConfigForm({ config, onClose }: { config?: ConfigAlerta; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    nombre: config?.nombre || '',
    tipo: config?.tipo || 'vencimiento',
    frecuencia: config?.frecuencia || 'diaria',
    canal: config?.canal || 'email',
    destinatarios: config ? JSON.parse(config.destinatarios).join(', ') : '',
    activa: config?.activa !== false,
  })
  const mutation = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = { ...d, destinatarios: d.destinatarios.split(',').map((e: string) => e.trim()).filter(Boolean) }
      return config ? api.put(`/alertas/config/${config.id}`, payload) : api.post('/alertas/config', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config-alertas'] }); qc.invalidateQueries({ queryKey: ['alertas-stats'] }); onClose() },
  })
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm(p => ({ ...p, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
        <Input value={form.nombre} onChange={e => set('nombre')(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
          <Select value={form.tipo} onValueChange={set('tipo')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Frecuencia</label>
          <Select value={form.frecuencia} onValueChange={set('frecuencia')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inmediata">Inmediata</SelectItem>
              <SelectItem value="diaria">Diaria</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Destinatarios (separados por coma)</label>
        <Input value={form.destinatarios} onChange={e => set('destinatarios')(e.target.value)} placeholder="email1@empresa.com, email2@empresa.com" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.activa} onChange={e => set('activa')(e.target.checked)} className="h-4 w-4" />
        Alerta activa
      </label>
      {mutation.isError && <p className="text-sm text-red-600">Error al guardar</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</Button>
      </DialogFooter>
    </form>
  )
}

export default function AlertasPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<ConfigAlerta | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['alertas-stats'],
    queryFn: () => api.get('/alertas/stats').then(r => r.data),
  })
  const { data: historial = [] } = useQuery<Alerta[]>({
    queryKey: ['alertas'],
    queryFn: () => api.get('/alertas').then(r => r.data),
  })
  const { data: configs = [], isLoading } = useQuery<ConfigAlerta[]>({
    queryKey: ['config-alertas'],
    queryFn: () => api.get('/alertas/config').then(r => r.data),
  })

  const deleteConfig = useMutation({
    mutationFn: (id: number) => api.delete(`/alertas/config/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config-alertas'] }),
  })

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sistema de Alertas</h1>
        <button
          onClick={() => { setSelectedConfig(null); setModal(true) }}
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          + Configurar Nueva Alerta
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Alertas Activas</p>
          <p className="mt-2 text-4xl font-bold text-gray-900">{stats?.activas || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notificaciones Enviadas (30 días)</p>
          <p className="mt-2 text-4xl font-bold text-gray-900">{stats?.enviadas30 || 0}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Usuarios Suscritos</p>
          <p className="mt-2 text-4xl font-bold text-gray-900">4</p>
        </div>
      </div>

      {/* Alert configs */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-gray-900">Alertas Configuradas</h2>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : (
          <div className="space-y-4">
            {configs.map(c => {
              const destinatarios: string[] = JSON.parse(c.destinatarios)
              return (
                <div key={c.id} className={`rounded-xl bg-white border border-gray-200 border-l-4 ${TIPO_BORDER[c.tipo] || 'border-gray-400'} overflow-hidden`}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-amber-500 text-lg">⚠</span>
                      <span className="font-semibold text-gray-900">{c.nombre}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedConfig(c); setModal(true) }}
                        className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => { if (confirm('¿Eliminar esta configuración?')) deleteConfig.mutate(c.id) }}
                        className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 px-5 py-4 border-b border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Frecuencia</p>
                      <p className="font-semibold text-gray-900 capitalize">{c.frecuencia}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Canal</p>
                      <p className="font-semibold text-gray-900 capitalize">📧 {c.canal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tipo</p>
                      <p className="font-semibold text-gray-900">{TIPO_LABELS[c.tipo] || c.tipo}</p>
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <p className="mb-2 text-xs text-gray-500">Usuarios que reciben esta alerta:</p>
                    <div className="flex flex-wrap gap-2">
                      {destinatarios.map(email => (
                        <span key={email} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                          👤 {email}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
            {configs.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-400">Sin configuraciones de alerta</p>
            )}
          </div>
        )}
      </section>

      {/* Historial de Notificaciones */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-gray-900">Historial de Notificaciones (Últimas 7 días)</h2>
        <div className="space-y-3">
          {historial.slice(0, 10).map(a => {
            const borderColor = {
              vencimiento: 'border-red-500',
              mantenimiento: 'border-amber-400',
              devolucion: 'border-blue-500',
              cambio_estado: 'border-blue-500',
            }[a.tipo] || 'border-gray-400'
            const icono = {
              vencimiento: '⚠️',
              mantenimiento: '🔧',
              devolucion: '🔔',
              cambio_estado: '🔔',
            }[a.tipo] || '🔔'
            return (
              <div key={a.id} className={`rounded-xl bg-white border border-gray-200 border-l-4 ${borderColor} p-4`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 mb-1">
                      {icono} {a.descripcion}
                    </p>
                    {a.vehiculo && (
                      <p className="text-sm mb-1">
                        <span className="font-semibold text-gray-800">{a.vehiculo.marca && `${a.vehiculo.marca} - `}</span>
                        <span className="text-blue-600">{a.vehiculo.modelo} {a.vehiculo.patente}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Enviado a: Admin Usuario
                    </p>
                  </div>
                  <span className="ml-6 flex-shrink-0 text-sm text-gray-400">
                    {formatDistanceToNow(new Date(a.creadoEn), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            )
          })}
          {historial.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">Sin notificaciones recientes</p>
          )}
        </div>
      </section>

      <Dialog open={modal} onOpenChange={o => !o && setModal(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedConfig ? 'Editar configuración' : 'Nueva configuración de alerta'}</DialogTitle></DialogHeader>
          {modal && <ConfigForm config={selectedConfig || undefined} onClose={() => setModal(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
