'use client'

import { useState } from 'react'
import { FileText, FileSpreadsheet, Mail, Loader2, X, Send } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

type LoadingKey = `${string}-${'pdf' | 'excel' | 'email'}`

interface EmailModalState {
  reportId: string
  titulo: string
}

export default function ReportesPage() {
  const [loading, setLoading] = useState<LoadingKey | null>(null)
  const [emailModal, setEmailModal] = useState<EmailModalState | null>(null)
  const [emailData, setEmailData] = useState({ formato: 'pdf' as 'pdf' | 'excel', destinatarios: '' })
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; previewUrl?: string } | null>(null)

  async function downloadReport(reportId: string, formato: 'pdf' | 'excel') {
    const key: LoadingKey = `${reportId}-${formato}`
    setLoading(key)
    try {
      const ext = formato === 'excel' ? 'xlsx' : 'pdf'
      const response = await api.get(`/reportes/download/${reportId}?formato=${formato}`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportId}_${new Date().toISOString().slice(0, 10)}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al generar el reporte. Intente nuevamente.')
    } finally {
      setLoading(null)
    }
  }

  function openEmailModal(reportId: string, titulo: string) {
    setEmailResult(null)
    setEmailData({ formato: 'pdf', destinatarios: '' })
    setEmailModal({ reportId, titulo })
  }

  async function sendEmail() {
    if (!emailModal) return
    const destinatarios = emailData.destinatarios.split(',').map(s => s.trim()).filter(Boolean)
    if (!destinatarios.length) return
    setEmailSending(true)
    setEmailResult(null)
    try {
      const res = await api.post(`/reportes/email/${emailModal.reportId}`, {
        formato: emailData.formato,
        destinatarios,
      })
      setEmailResult({ ok: true, previewUrl: res.data.previewUrl })
    } catch {
      setEmailResult({ ok: false })
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Report cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTES.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="mb-3 text-2xl">{r.emoji}</div>
            <h3 className="font-bold text-gray-900 mb-1">{r.titulo}</h3>
            <p className="text-sm text-gray-500 mb-5 flex-1">{r.desc}</p>
            <div className="flex gap-2">
              <ActionButton
                onClick={() => downloadReport(r.id, 'pdf')}
                loading={loading === `${r.id}-pdf`}
                icon={<FileText className="h-3.5 w-3.5" />}
                label="PDF"
                title="Descargar PDF"
              />
              <ActionButton
                onClick={() => downloadReport(r.id, 'excel')}
                loading={loading === `${r.id}-excel`}
                icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                label="Excel"
                title="Descargar Excel"
                variant="outline"
              />
              <ActionButton
                onClick={() => openEmailModal(r.id, r.titulo)}
                loading={loading === `${r.id}-email`}
                icon={<Mail className="h-3.5 w-3.5" />}
                label=""
                title="Enviar por mail"
                variant="ghost"
              />
            </div>
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

      {/* Email modal */}
      <Dialog open={!!emailModal} onOpenChange={open => { if (!open) setEmailModal(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Enviar por mail
            </DialogTitle>
          </DialogHeader>

          {emailResult ? (
            <div className="space-y-4">
              {emailResult.ok ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                  <p className="font-semibold mb-1">¡Enviado correctamente!</p>
                  <p className="text-green-700">{emailModal?.titulo}</p>
                  {emailResult.previewUrl && (
                    <a href={emailResult.previewUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-2 block text-xs text-blue-600 underline">
                      Ver email de prueba (Ethereal)
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                  Error al enviar el email. Verificá la configuración SMTP.
                </div>
              )}
              <button
                onClick={() => setEmailModal(null)}
                className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{emailModal?.titulo}</p>

              {/* Formato */}
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Formato</p>
                <div className="flex gap-2">
                  {(['pdf', 'excel'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setEmailData(d => ({ ...d, formato: f }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors
                        ${emailData.formato === f ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {f === 'pdf' ? <FileText className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destinatarios */}
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase mb-2 block">
                  Destinatarios
                </label>
                <input
                  type="text"
                  placeholder="email@ejemplo.com, otro@ejemplo.com"
                  value={emailData.destinatarios}
                  onChange={e => setEmailData(d => ({ ...d, destinatarios: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black transition-colors"
                  onKeyDown={e => { if (e.key === 'Enter') sendEmail() }}
                />
                <p className="mt-1 text-xs text-gray-400">Separar múltiples emails con coma</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEmailModal(null)}
                  className="flex-1 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendEmail}
                  disabled={emailSending || !emailData.destinatarios.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {emailSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Enviar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ActionButtonProps {
  onClick: () => void
  loading: boolean
  icon: React.ReactNode
  label: string
  title: string
  variant?: 'solid' | 'outline' | 'ghost'
}

function ActionButton({ onClick, loading, icon, label, title, variant = 'solid' }: ActionButtonProps) {
  const base = 'flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50'
  const variants = {
    solid: 'bg-black text-white hover:bg-gray-800',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
  }
  return (
    <button onClick={onClick} disabled={loading} title={title} className={`${base} ${variants[variant]}`}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label && <span>{label}</span>}
    </button>
  )
}
