# EcoSched

EcoSched helps users explore carbon-aware cloud workload scheduling using renewable energy, weather context, and Before vs After comparisons.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ecosched` — deployable React + Vite product UI and analysis flow
- `artifacts/api-server/src/routes/ecosched.ts` — catalog, weather, validation, dashboard, and scheduling API
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `artifacts/ecosched/src/index.css` — EcoSched visual tokens and theme
- `attached_assets/ecosched-logo.png` — uploaded EcoSched logo used across the app

## Architecture decisions

- The first dataset is intentionally labeled `DEMO DATA`; live weather and emission factors remain configurable rather than being represented as real measurements.
- Scheduling is separated from the UI and exposes both a segment-tree availability query path and decreasing energy bin-packing heuristic through the API.
- The UI uses generated OpenAPI React Query hooks for every catalog, dashboard, validation, weather, and scheduling request.

## Product

- Brand-led landing page using the uploaded EcoSched logo and logo-derived green/blue/yellow/light-blue semantic palette.
- Guided workspace flow for data-center selection, workload entry and validation, weather and energy analysis, scheduling, dashboard KPIs, Before vs After comparison, and results reporting.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
