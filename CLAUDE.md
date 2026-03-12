# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAD (Sistema de Ayuda a Domicilio) is a Next.js 16 + Supabase management platform for home-based assistance services (caregivers, auxiliaries, nurses). It serves three user roles — Admin, Supervisor, Worker — each with dedicated dashboards. A companion mobile app (Expo) consumes the REST API.

## Commands

```bash
# Development
npm run dev              # Dev server on port 3001
npm run build            # Production build
npm run type-check       # TypeScript validation
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier format
npm run format:check     # Check Prettier compliance

# Database (Supabase)
npm run db:types         # Regenerate TypeScript types from Supabase schema
npm run db:pull          # Sync local schema from remote Supabase
npm run db:push          # Push local schema changes to Supabase
npm run db:status        # Check Supabase connection status
```

There are no automated tests beyond type-checking, linting, and the holiday scripts. Pre-commit hooks (Husky + lint-staged) run lint and format checks automatically.

## Architecture

### Tech Stack

- **Next.js 16** with App Router, **React 19**, **TypeScript** (strict mode)
- **Supabase** for PostgreSQL database, Auth, and Realtime subscriptions
- **TanStack React Query v5** for server state management and caching
- **Tailwind CSS v4** for styling
- **Zod v4** + **React Hook Form** for form validation
- Path alias: `@/*` → `./src/*`

### Three-Dashboard Structure

Each role has its own route and layout:

- `/dashboard` — Admin dashboard
- `/worker-dashboard` — Worker self-service view
- `/super-dashboard` — Supervisor view

The `useAuth` hook (from `AuthContext`) provides the current user's role; `useDashboardUrl` redirects to the correct dashboard after login.

### API Layer (`/src/app/api/`)

All external-facing endpoints use versioned routes under `/api/v1/`. The mobile app authenticates with Bearer tokens. Response format is consistent:

```typescript
{ data: T, error?: string, status: number }
```

Key endpoint groups:

- `/api/v1/auth/` — login, logout
- `/api/v1/worker/` — worker profile, assignments, balances
- `/api/workers/[id]/notifications/` — notification CRUD

### Database Access Pattern

Two Supabase clients exist:

- `src/lib/supabase.ts` — public anon client for client-side authenticated requests
- `src/lib/supabase-admin.ts` — service role client for server-side API routes (bypasses RLS)

Query logic is organized into per-domain files in `src/lib/`: `workers-query.ts`, `assignments-query.ts`, `users-query.ts`, etc. These are called from both API routes and React Query hooks in components.

TypeScript types are generated from the live Supabase schema (`npm run db:types` → `src/types/supabase.ts`). Always regenerate after schema changes.

### Authentication & Authorization

- Supabase Auth with email/password; sessions auto-refresh
- `AuthContext` (React Context + useReducer) holds the session and `userRole`
- Worker-specific auth helpers are in `src/lib/worker-auth.ts`
- Row Level Security (RLS) is enforced at the database level; migrations in `supabase/migrations/`

### Real-time Notifications

`NotificationService` (`src/lib/notification-service.ts`) is a singleton that manages Supabase Realtime subscriptions. The `useNotifications` hook connects components to this service. Audio files for notification sounds live in `public/sounds/`.

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-side only
SUPABASE_PROJECT_ID=              # For CLI commands (db:types, db:pull)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # Optional, for route planning
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Copy `env.example` to `.env.local` to get started.

## Code Quality

- **ESLint v10** enforces `no-any`, exhaustive React hook deps, and Next.js rules. Run `npm run lint:fix` before committing.
- **Prettier** with 80-char line width, 2-space indent. Import sorting is automatic.
- Husky pre-commit hooks run lint-staged on changed files — do not skip with `--no-verify`.
- GitHub Actions runs CI on every push: type-check, lint, build, and CodeQL scanning.
- Deployment is automatic to Vercel on push to `main`.
