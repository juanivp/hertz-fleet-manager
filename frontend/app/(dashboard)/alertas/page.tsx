'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import api, { ConfigAlerta, Alerta, Usuario } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_OPCIONES = [
  { value: 'proximo_venta', label: 'Vehículo próximo a venta (tiempo en renting)' },
  { value: 'nueva_reserva', label: 'Nueva reserva creada' },
  { value: 'reserva_modificada', label: 'Reserva modificada' },
  { value: 'reserva_cancelada', label: 'Reserva cancelada' },
  { value: 'devolucion_proxima', label: 'Devolución próxima (24h antes)' },
  { value: 'mantenimiento_programado', label: 'Mantenimiento programado' },
  { value: 'sin_actividad', label: 'Vehículo sin actividad (X días)' },
]

const FRECUENCIA_OPCIONES = [
  { value: 'tiempo_real', label: 'Tiempo real' },
  { value: 'diaria', label: 'Diaria' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
]

const TIPO_BORDER: Record<string, string> = {
  proximo_venta: 'border-amber-400',
  nueva_reserva: 'border-blue-500',
  reserva_modificada: 'border-blue-500',
  reserva_cancelada: 'border-red-500',
  devolucion_proxima: 'border-blue-500',
  mantenimiento_programado: 'border-amber-400',
  sin_actividad: 'border-gray-400',
  // legacy
  vencimiento: 'border-amber-400',
  mantenimiento: 'border-amber-400',
  devolucion: 'border-blue-500',
  cambio_estado: 'border-purple-500',
  otro: 'border-gray-400',
}

const TIPO_ICON: Record<string, string> = {
  proximo_venta: '⚠',
  nueva_reserva: '🔔',
  reserva_modificada: '🔔',
  reserva_cancelada: '🔔',
  devolucion_proxima: '🔔',
  mantenimiento_programado: '🔧',
  sin_actividad: '💤',
  vencimiento: '⚠',
  mantenimiento: '🔧',
  devolucion: '🔔',
  cambio_estado: '🔔',
  otro: '🔔',
}

function tipoLabel(tipo: string) {
  return TIPO_OPCIONES.find(o => o.value === tipo)?.label || tipo
}

function frecuenciaLabel(frecuencia: string) {
  return FRECUENCIA_OPCIONES.find(o => o.value === frecuencia)?.label || frecuencia
}

function ConfigForm({ config, onClose, usuarios }: { config?: ConfigAlerta; onClose: () => void; usuarios: Usuario[] }) {
  const qc = useQueryClient()
  const existingDestinatarios: string[] = config ? JSON.parse(config.destinatarios) : []

  const [tipo, setTipo] = useState(config?.tipo || '')
  const [frecuencia, setFrecuencia] = useState(config?.frecuencia || 'tiempo_real')
  const [horaEnvio, setHoraEnvio] = useState(config?.horaEnvio || '09:00')
  const [canalEmail, setCanalEmail] = useState(config ? config.canal.includes('email') : true)
  const [canalApp, setCanalApp] = useState(config?.canal.includes('app') || false)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set(existingDestinatarios))
  const [mensajePersonalizado, setMensajePersonalizado] = useState(config?.mensajePersonalizado || '')

  const toggleUser = (email: string) =>
    setSelectedEmails(prev => {
      const next = new Set(prev)
      next.has(email) ? next.delete(email) : next.add(email)
      return next
    })

  const mutation = useMutation({
    mutationFn: () => {
      const nombre = TIPO_OPCIONES.find(o => o.value === tipo)?.label || tipo
      const canal = [canalEmail && 'email', canalApp && 'app'].filter(Boolean).join(',') || 'email'
      const payload = {
        nombre,
        tipo,
        frecuencia,
        horaEnvio: frecuencia !== 'tiempo_real' ? horaEnvio : null,
        canal,
        destinatarios: [...selectedEmails],
        mensajePersonalizado: mensajePersonalizado.trim() || null,
        activa: config?.activa !== false,
      }
      return config ? api.put(`/alertas/config/${config.id}`, payload) : api.post('/alertas/config', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-alertas'] })
      qc.invalidateQueries({ queryKey: ['alertas-stats'] })
      onClose()
    },
  })

  const activeUsers = usuarios.filter(u => u.activo)
  const canSubmit = tipo !== '' && selectedEmails.size > 0

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="space-y-5">
      {/* Tipo de Alerta */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Tipo de Alerta <span className="text-red-500">*</span>
        </label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>
            {TIPO_OPCIONES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Frecuencia + Hora de envío */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Frecuencia <span className="text-red-500">*</span>
          </label>
          <Select value={frecuencia} onValueChange={setFrecuencia}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FRECUENCIA_OPCIONES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {frecuencia !== 'tiempo_real' && (
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700">
              Hora de envío
              <span title="Hora en que se enviará la notificación diaria" className="cursor-help text-gray-400">ℹ</span>
            </label>
            <input
              type="time"
              value={horaEnvio}
              onChange={e => setHoraEnvio(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        )}
      </div>

      {/* Canal de notificación */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-700">
          Canal de notificación <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={canalEmail} onChange={e => setCanalEmail(e.target.checked)} className="h-4 w-4" />
            Email
          </label>
          <label className="flex cursor-not-allowed items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed" />
            SMS <span className="text-xs">(próximamente)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={canalApp} onChange={e => setCanalApp(e.target.checked)} className="h-4 w-4" />
            Notificación en la app
          </label>
        </div>
      </div>

      {/* Usuarios */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-700">
          Usuarios que recibirán esta alerta:
        </label>
        <div className="space-y-2.5 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
          {activeUsers.map(u => (
            <label key={u.email} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={selectedEmails.has(u.email)}
                onChange={() => toggleUser(u.email)}
                className="h-4 w-4 flex-shrink-0"
              />
              <span className="font-medium text-gray-800">{u.nombre}</span>
              <span className="text-gray-500">({u.email})</span>
            </label>
          ))}
          {activeUsers.length === 0 && (
            <p className="text-xs text-gray-400">No hay usuarios activos</p>
          )}
        </div>
      </div>

      {/* Mensaje personalizado */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Mensaje personalizado <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={mensajePersonalizado}
          onChange={e => setMensajePersonalizado(e.target.value)}
          placeholder="Puedes agregar un mensaje adicional que se incluirá en la alerta..."
          className="min-h-[80px] w-full resize-none rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {mutation.isError && <p className="text-sm text-red-600">Error al guardar</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending || !canSubmit}>
          {mutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {config ? 'Guardar cambios' : 'Crear Alerta'}
        </Button>
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
  const { data: usuarios = [] } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
  })
  const emailToNombre = Object.fromEntries(usuarios.map(u => [u.email, u.nombre]))

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
                      <span className="text-amber-500 text-lg">{TIPO_ICON[c.tipo] || '🔔'}</span>
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
                      <p className="font-semibold text-gray-900">{frecuenciaLabel(c.frecuencia)}{c.horaEnvio ? ` (${c.horaEnvio})` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Canal</p>
                      <p className="font-semibold text-gray-900">📧 {c.canal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tipo</p>
                      <p className="font-semibold text-gray-900">{tipoLabel(c.tipo)}</p>
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <p className="mb-2 text-xs font-medium text-gray-700">Usuarios que reciben esta alerta:</p>
                    <div className="flex flex-wrap gap-2">
                      {destinatarios.map(email => {
                        const nombre = emailToNombre[email]
                        return (
                          <span key={email} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                            👤 {nombre ? `${nombre} (${email})` : email}
                          </span>
                        )
                      })}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedConfig ? 'Editar configuración' : 'Configurar Nueva Alerta'}</DialogTitle>
          </DialogHeader>
          {modal && (
            <ConfigForm
              config={selectedConfig || undefined}
              onClose={() => setModal(false)}
              usuarios={usuarios}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
