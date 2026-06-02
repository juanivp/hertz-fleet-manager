'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
import { tokenStore } from './tokenStore'
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
        tokenStore.set(session.access_token)
        try {
          const { data } = await api.get('/auth/me')
          setUsuario(data)
        } catch {
          tokenStore.set(null)
          setUsuario(null)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        tokenStore.set(null)
        setUsuario(null)
      }
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        tokenStore.set(session.access_token)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    tokenStore.set(authData.session!.access_token)
    const { data } = await api.get('/auth/me')
    setUsuario(data)
    router.push('/dashboard')
  }

  async function logout() {
    await supabase.auth.signOut()
    tokenStore.set(null)
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
