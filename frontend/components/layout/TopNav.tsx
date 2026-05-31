'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/planilla', label: 'Vista Planilla' },
  { href: '/flota', label: 'Gestión de Flota' },
  { href: '/alertas', label: 'Alertas' },
  { href: '/calendario', label: 'Calendario' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/usuarios', label: 'Usuarios' },
  { href: '/actividad', label: 'Registro de Actividad' },
]

export function TopNav() {
  const pathname = usePathname()
  const { usuario, logout } = useAuth()

  return (
    <header className="w-full sticky top-0 z-50">
      {/* Black top bar */}
      <div className="flex items-center justify-between bg-black px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">Hertz Fleet Manager</h1>
          <p className="text-sm font-semibold text-amber-400">Grupo Randazo</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white">{usuario?.nombre}</span>
          <button
            onClick={logout}
            className="rounded px-4 py-2 text-sm font-bold bg-amber-400 text-black hover:bg-amber-500 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* White nav tabs bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <nav className="flex px-8 overflow-x-auto">
          {navItems.map(({ href, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-sm border-b-2 transition-colors',
                  active
                    ? 'border-amber-500 text-gray-900 font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
