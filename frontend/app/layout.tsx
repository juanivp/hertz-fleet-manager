import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Fleet Manager - Grupo Randazzo',
  description: 'Sistema de gestión de flota vehicular',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
