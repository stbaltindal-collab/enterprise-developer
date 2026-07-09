# Nexus Console — Multi-Tenant B2B SaaS Platform

Enterprise personnel management SaaS with multi-tenant isolation, RBAC, and Excel upload capabilities.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/saas-platform run dev` — run the frontend (port 19504)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — Session signing secret

## Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@platform.com | Admin123! |
| Company Admin (TechVision) | admin@techvision.com.tr | Admin123! |
| Company Admin (Anadolu Finans) | admin@anadolufinans.com.tr | Admin123! |
| Company Admin (Global Lojistik) | admin@globallojistik.com | Admin123! |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + shadcn/ui + Recharts + wouter
- API: Express 5 + express-session
- DB: PostgreSQL + Drizzle ORM
- Auth: Session-based with bcrypt password hashing
- Excel upload: multer + xlsx
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where Things Live

- `lib/api-spec/openapi.yaml` — Single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (companies, users, employees, upload_logs)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — RBAC middleware
- `artifacts/saas-platform/src/pages/` — React page components
- `artifacts/saas-platform/src/components/layout/` — Sidebar + Header layout

## Architecture Decisions

- **Session-based auth**: Server-side sessions with express-session for simplicity and security (no JWT leakage risk).
- **Multi-tenant isolation**: Every DB query scopes by `companyId` from session; company_admins and employees can never access other tenants' data. Mutation routes verify target record ownership before operating.
- **RBAC**: Three roles (super_admin, company_admin, employee) enforced server-side via middleware. Clients never trust client-provided role values.
- **OpenAPI-first**: Spec drives both server Zod schemas and React Query hooks via Orval codegen.
- **Excel upload**: multer parses multipart form, xlsx reads .xlsx binary buffer; Turkish and English column headers both supported.

## User Roles

| Role | Permissions |
|------|-------------|
| super_admin | Full access: all companies, all users, all employees, all stats |
| company_admin | Scoped to own company: manage employees, users, upload Excel, view dashboard |
| employee | Read-only: own profile, own company's basic info |

## User Preferences

- UI language: English (Turkish column headers supported in Excel upload)
- Enterprise design language: slate/indigo palette, Stripe/Linear/Vercel inspired
- No emojis in UI

## Gotchas

- After changing the OpenAPI spec, always run codegen before changing route handlers.
- The upload endpoint (`POST /api/employees/upload`) accepts multipart/form-data with field `file` + `companyId`; do NOT use the generated `useUploadEmployees` hook for this — use raw FormData fetch instead.
- Sessions are in-memory (MemoryStore); a production deployment should use a persistent store (Redis or DB-backed).
