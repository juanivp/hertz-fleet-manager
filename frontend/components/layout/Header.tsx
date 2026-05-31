'use client'

import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export function Header({ title }: { title: string }) {
  const [alertasCount, setAlertasCount] = useState(0)

  useEffect(() => {
    api.get('/alertas/stats').then(({ data }) => setAlertasCount(data.activas)).catch(() => {})
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          {alertasCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {alertasCount > 9 ? '9+' : alertasCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
