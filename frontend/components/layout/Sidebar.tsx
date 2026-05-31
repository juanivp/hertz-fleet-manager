'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Table2, Car, Bell, Calendar, BarChart3, Users, ScrollText, LogOut, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/planilla', label: 'Vista Planilla', icon: Table2 },
  { href: '/flota', label: 'Gestión de Flota', icon: Car },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/calendario', label: 'Calendario', icon: Calendar },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/usuarios', label: 'Usuarios', icon: Users },
  { href: '/actividad', label: 'Registro de Actividad', icon: ScrollText },
]

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, logout } = useAuth()

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center px-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-blue-400" />
          <div>
            <p className="text-sm font-bold leading-none">Fleet Manager</p>
            <p className="text-xs text-slate-400 mt-0.5">Grupo Randazzo</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-6 py-2.5 text-sm transition-colors group',
                active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-70" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
            {usuario?.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{usuario?.nombre}</p>
            <p className="text-xs text-slate-400 capitalize">{usuario?.rol}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
