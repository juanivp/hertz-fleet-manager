'use client'

import { useState, FormEvent } from 'react'
import { Car, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@flota.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
              <Car className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Manager</h1>
            <p className="mt-1 text-sm text-gray-500">Grupo Randazzo</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Contraseña</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Ingresar
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Demo: admin@flota.com / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
