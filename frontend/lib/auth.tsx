'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
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
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        try {
          const { data } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          setUsuario(data)
        } catch {
          setUsuario(null)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUsuario(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
    console.log('[login] error:', error?.message ?? null)
    console.log('[login] session:', authData.session ? 'present' : 'null')
    console.log('[login] token prefix:', authData.session?.access_token?.slice(0, 30) ?? 'none')
    if (error) throw error
    const { data } = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${authData.session!.access_token}` },
    })
    setUsuario(data)
    router.push('/dashboard')
  }

  async function logout() {
    await supabase.auth.signOut()
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
