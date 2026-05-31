'use client'

import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'disponible' | 'alquilado' | 'reservado' | 'mantenimiento' | 'proximo_venta' | 'admin' | 'operador' | 'visualizador' | 'activo' | 'inactivo'
}

const variantClasses: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  disponible: 'bg-green-100 text-green-800',
  alquilado: 'bg-blue-100 text-blue-800',
  reservado: 'bg-yellow-100 text-yellow-800',
  mantenimiento: 'bg-orange-100 text-orange-800',
  proximo_venta: 'bg-red-100 text-red-800',
  admin: 'bg-purple-100 text-purple-800',
  operador: 'bg-blue-100 text-blue-800',
  visualizador: 'bg-gray-100 text-gray-700',
  activo: 'bg-green-100 text-green-800',
  inactivo: 'bg-red-100 text-red-800',
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variantClasses[variant] || variantClasses.default, className)} {...props}>
      {children}
    </span>
  )
}

export function EstadoBadge({ estado }: { estado: string }) {
  const labels: Record<string, string> = {
    disponible: 'Disponible',
    alquilado: 'Alquilado',
    reservado: 'Reservado',
    mantenimiento: 'Mantenimiento',
    proximo_venta: 'Próx. Venta',
    activa: 'Activa',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  }
  return <Badge variant={estado as BadgeProps['variant']}>{labels[estado] || estado}</Badge>
}
