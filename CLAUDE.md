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
npm run build        # tsc — use to verify TypeScript
npm run db:seed      # repopulate SQLite with demo data (24 vehicles, 4 users)
npm run db:reset     # drop + migrate + seed
npm run db:studio    # Prisma Studio at localhost:5555
npx prisma migrate dev --name <name>  # create new migration
```

### Frontend only
```powershell
cd frontend
npx next dev         # dev server
npx next build       # production build — use to verify TypeScript
npm run lint         # ESLint
```

## Architecture

Monorepo with two workspaces under `npm workspaces`:
- `frontend/` — Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui-style components
- `backend/` — Node.js + Express + TypeScript, Prisma ORM, SQLite (`backend/prisma/dev.db`)

> **Next.js 16 note**: This project uses Next.js 16 with React 19, which has breaking changes vs earlier versions. APIs, conventions, and file structure may differ from older training data. Read relevant guides in `node_modules/next/dist/docs/` before writing code.

> **Tailwind v4 note**: Uses the PostCSS plugin (`@tailwindcss/postcss`) approach, not the v3 JIT config. No `tailwind.config.js` file exists.

### Authentication flow
JWT-based. Backend issues tokens on `POST /api/auth/login`. Frontend stores token in `localStorage` and attaches it via `axios` interceptor in `frontend/lib/api.ts`. The `AuthProvider` (`frontend/lib/auth.tsx`) wraps the app and provides `useAuth()`. The dashboard layout (`frontend/app/(dashboard)/layout.tsx`) redirects unauthenticated users to `/login` via `useEffect`.

Demo credentials: `admin@flota.com` / `admin123`

The `AuthProvider` restores session from `localStorage` on mount (no backend call). On 401 responses, the axios interceptor clears `localStorage` and redirects to `/login`.

### Frontend routing (`frontend/app/`)
Route group `(dashboard)` wraps all authenticated pages — does NOT add a URL segment. The layout renders `<TopNav />` (horizontal sticky nav bar) above `<main>`.

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
All server state is managed by TanStack Query (`@tanstack/react-query`). Default `staleTime: 30_000`, `retry: 1`. The `api` instance in `frontend/lib/api.ts` is an axios client pointing to `http://localhost:3001/api`. Cache is invalidated via `queryClient.invalidateQueries()` after mutations.

`frontend/lib/api.ts` also exports all shared TypeScript interfaces (`Vehiculo`, `Reserva`, `Alerta`, `Usuario`, `Actividad`, `Stats`, `ConfigAlerta`) and the `ESTADOS_VEHICULO` / `CATEGORIAS` const arrays. Import types from here rather than defining them locally.

The `cn()` utility in `frontend/lib/utils.ts` merges Tailwind classes (wraps `clsx` + `tailwind-merge`).

### Backend API (`backend/src/`)
Express app at port 3001. CORS is locked to `http://localhost:3000`. All routes except `/api/auth/login` require Bearer JWT via `authenticate` middleware (`backend/src/middleware/auth.ts`), which attaches `req.userId` and `req.userRol`. Admin-only operations use `requireAdmin` (returns 403 if role is not `admin`).

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
- `GET /api/alertas/config` — alert configuration rules (CRUD also available)
- `GET /api/actividad?entidad=<Vehiculo|Reserva|...>&limit=<n>` — activity log (default limit 50)
- `GET /api/reportes/ocupacion|reservas|mantenimiento|ejecutivo` — report data

**Activity logging pattern**: Every mutating route handler creates a `RegistroActividad` record after the primary operation. Any new route that creates, updates, or deletes a record must follow this pattern using `prisma.registroActividad.create({ data: { usuarioId: req.userId, accion: '...', detalle: '...', entidad: '...', entidadId: ... } })`.

**Reservation ↔ vehicle state coupling**: Creating a reservation (`POST /api/reservas`) automatically sets the vehicle's `estado` to `'reservado'`. Finalizing or canceling a reservation checks whether any other active reservations remain for that vehicle; if none, the vehicle is set back to `'disponible'`.

### Database schema (Prisma + SQLite)
Six models: `Usuario`, `Vehiculo`, `Reserva`, `Alerta`, `ConfigAlerta`, `RegistroActividad`. See `backend/prisma/schema.prisma`.

Vehicle `estado` values: `disponible` | `alquilado` | `reservado` | `mantenimiento` | `proximo_venta`

Vehicle `categoria` values: `C` (compact) | `H` (hybrid) | `K` (SUV) | `S` | `E`

Reservation `estado` values: `activa` | `finalizada` | `cancelada`

User `rol` values: `admin` | `operador` | `visualizador`

Alerta `tipo` values: `vencimiento` | `mantenimiento` | `devolucion` | `cambio_estado` | `otro`

**`ConfigAlerta.destinatarios`** is stored as a JSON array serialized to a string (e.g. `'["user@example.com"]'`). Serialize with `JSON.stringify()` on write, parse with `JSON.parse()` on read.

### UI components (`frontend/components/`)
Custom shadcn-style components (not installed via CLI — files are in repo):
- `ui/button.tsx`, `ui/input.tsx`, `ui/badge.tsx`, `ui/dialog.tsx`, `ui/select.tsx`
- `layout/TopNav.tsx` — sticky horizontal nav bar used by the dashboard layout (black top bar + white tab strip)
- `layout/Sidebar.tsx`, `layout/Header.tsx` — exist in repo but not used by the current dashboard layout

`EstadoBadge` in `badge.tsx` maps vehicle/reservation state strings to color-coded badges.
