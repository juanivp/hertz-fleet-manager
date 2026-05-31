'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !usuario) router.push('/login')
  }, [usuario, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }
  if (!usuario) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main>{children}</main>
    </div>
  )
}
