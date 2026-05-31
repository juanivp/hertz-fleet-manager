# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development (run each in a separate terminal)
```powershell
# Backend (Node.js + Express, port 3001)
npm run dev:backend

# Frontend (Next.js 16, port 3000)
npm run dev:frontend
```

### Backend only
```powershell
cd backend
npm run dev          # tsx watch src/index.ts
npm run db:seed      # repopulate SQLite with demo data (24 vehicles, 4 users)
npm run db:reset     # drop + migrate + seed
npm run db:studio    # Prisma Studio at localhost:5555
npx prisma migrate dev --name <name>  # create new migration
```

### Frontend only
```powershell
cd frontend
npx next dev         # dev server
npx next build       # production build (use to verify TypeScript)
```

## Architecture

Monorepo with two workspaces under `npm workspaces`:
- `frontend/` — Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS, shadcn/ui components
- `backend/` — Node.js + Express + TypeScript, Prisma ORM, SQLite (`backend/prisma/dev.db`)

### Authentication flow
JWT-based. Backend issues tokens on `POST /api/auth/login`. Frontend stores token in `localStorage` and attaches it via `axios` interceptor in `frontend/lib/api.ts`. The `AuthProvider` (`frontend/lib/auth.tsx`) wraps the app and provides `useAuth()`. The dashboard layout (`frontend/app/(dashboard)/layout.tsx`) redirects unauthenticated users to `/login`.

Demo credentials: `admin@flota.com` / `admin123`

### Frontend routing (`frontend/app/`)
Route group `(dashboard)` wraps all authenticated pages — does NOT add a URL segment.

| URL | Page file |
|-----|-----------|
| `/` | redirects → `/dashboard` |
| `/login` | `(auth)/login/page.tsx` |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` |
| `/flota` | `(dashboard)/flota/page.tsx` |
| `/planilla` | `(dashboard)/planilla/page.tsx` |
| `/alertas` | `(dashboard)/alertas/page.tsx` |
| `/calendario` | `(dashboard)/calendario/page.tsx` |
| `/reportes` | `(dashboard)/reportes/page.tsx` |
| `/usuarios` | `(dashboard)/usuarios/page.tsx` |
| `/actividad` | `(dashboard)/actividad/page.tsx` |

### Frontend data fetching
All server state is managed by TanStack Query (`@tanstack/react-query`). The `api` instance in `frontend/lib/api.ts` is an axios client pointing to `http://localhost:3001/api`. Cache is invalidated via `queryClient.invalidateQueries()` after mutations.

### Backend API (`backend/src/`)
Express app at port 3001. All routes except `/api/auth/login` require Bearer JWT via `authenticate` middleware. Admin-only operations use `requireAdmin`.

| Router file | Mounted at |
|-------------|-----------|
| `routes/auth.ts` | `/api/auth` |
| `routes/vehiculos.ts` | `/api/vehiculos` |
| `routes/reservas.ts` | `/api/reservas` |
| `routes/alertas.ts` | `/api/alertas` |
| `routes/usuarios.ts` | `/api/usuarios` |
| `routes/actividad.ts` | `/api/actividad` |
| `routes/reportes.ts` | `/api/reportes` |

Key endpoints:
- `GET /api/vehiculos/stats` — KPI counts for the dashboard
- `GET /api/alertas/stats` — active + sent-last-30-days counts
- `GET /api/reportes/ocupacion|reservas|mantenimiento|ejecutivo` — report data

### Database schema (Prisma + SQLite)
Six models: `Usuario`, `Vehiculo`, `Reserva`, `Alerta`, `ConfigAlerta`, `RegistroActividad`. See `backend/prisma/schema.prisma`.

Vehicle `estado` values: `disponible` | `alquilado` | `reservado` | `mantenimiento` | `proximo_venta`

Vehicle `categoria` values used in demo: `C` (compact), `H` (hybrid), `K` (SUV)

Reservation `estado` values: `activa` | `finalizada` | `cancelada`

User `rol` values: `admin` | `operador` | `visualizador`

### UI components (`frontend/components/`)
Custom shadcn-style components (not installed via CLI — files are in repo):
- `ui/button.tsx`, `ui/input.tsx`, `ui/badge.tsx`, `ui/dialog.tsx`, `ui/select.tsx`
- `layout/Sidebar.tsx` — dark slate sidebar with 8 nav items
- `layout/Header.tsx` — page title + alert bell counter

`EstadoBadge` in `badge.tsx` maps vehicle/reservation state strings to color-coded badges.
