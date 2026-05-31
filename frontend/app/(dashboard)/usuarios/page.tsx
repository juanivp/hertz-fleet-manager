'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import api, { Usuario } from '@/lib/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/lib/auth'

const ROL_BADGE: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-800',
  operador: 'bg-green-100 text-green-800',
  visualizador: 'bg-gray-100 text-gray-600',
}
const ROL_LABELS: Record<string, string> = { admin: 'Administrador', operador: 'Operador', visualizador: 'Visualizador' }

function UsuarioForm({ usuario, onClose }: { usuario?: Usuario; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    rol: usuario?.rol || 'operador',
    activo: usuario?.activo !== false,
    password: '',
  })
  const mutation = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = d.password ? d : { nombre: d.nombre, email: d.email, rol: d.rol, activo: d.activo }
      return usuario ? api.put(`/usuarios/${usuario.id}`, payload) : api.post('/usuarios', d)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); onClose() },
  })
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm(p => ({ ...p, [k]: v }))
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Nombre completo</label>
        <Input value={form.nombre} onChange={e => set('nombre')(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
        <Input type="email" value={form.email} onChange={e => set('email')(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">{usuario ? 'Nueva contraseña (vacío = sin cambios)' : 'Contraseña'}</label>
        <Input type="password" value={form.password} onChange={e => set('password')(e.target.value)} required={!usuario} placeholder={usuario ? 'Sin cambios' : ''} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Rol</label>
        <Select value={form.rol} onValueChange={set('rol')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="operador">Operador</SelectItem>
            <SelectItem value="visualizador">Visualizador</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {usuario && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.activo} onChange={e => set('activo')(e.target.checked)} className="h-4 w-4" />
          Usuario activo
        </label>
      )}
      {mutation.isError && <p className="text-sm text-red-600">Error al guardar.</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</Button>
      </DialogFooter>
    </form>
  )
}

export default function UsuariosPage() {
  const qc = useQueryClient()
  const { usuario: me } = useAuth()
  const [modal, setModal] = useState(false)
  const [selected, setSelected] = useState<Usuario | null>(null)

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then(r => r.data),
  })

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        {me?.rol === 'admin' && (
          <button
            onClick={() => { setSelected(null); setModal(true) }}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            + Agregar Usuario
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Último Acceso</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.nombre}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROL_BADGE[u.rol] || 'bg-gray-100 text-gray-600'}`}>
                      {ROL_LABELS[u.rol] || u.rol}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {u.ultimoAcceso ? format(new Date(u.ultimoAcceso), "dd/MM/yyyy HH:mm", { locale: es }) : 'Nunca'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {me?.rol === 'admin' && (
                      <button
                        onClick={() => { setSelected(u); setModal(true) }}
                        className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Niveles de Acceso */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Niveles de Acceso</h2>
        <div className="space-y-2 text-sm">
          <p><span className="font-bold">Administrador:</span> <span className="text-gray-600">Acceso completo. Puede agregar/editar vehículos, usuarios, configurar alertas y generar reportes.</span></p>
          <p><span className="font-bold">Operador:</span> <span className="text-gray-600">Puede gestionar reservas, actualizar estado de vehículos y generar reportes. No puede modificar usuarios.</span></p>
          <p><span className="font-bold">Visualizador:</span> <span className="text-gray-600">Solo puede consultar información y generar reportes. Sin permisos de edición.</span></p>
        </div>
      </section>

      <Dialog open={modal} onOpenChange={o => !o && setModal(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle></DialogHeader>
          {modal && <UsuarioForm usuario={selected || undefined} onClose={() => setModal(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
