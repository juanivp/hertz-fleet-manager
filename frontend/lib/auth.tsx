'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from './api'

interface UsuarioAuth {
  id: number
  nombre: string
  email: string
  rol: string
}

interface AuthCtx {
  usuario: UsuarioAuth | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    const token = localStorage.getItem('token')
    if (stored && token) {
      setUsuario(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    router.push('/dashboard')
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
    router.push('/login')
  }

  return <AuthContext.Provider value={{ usuario, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
