# Glassleaf

Glassleaf is a React-based ebook platform with a premium, Apple Books inspired interface, cross-device account support, fast EPUB-first ingestion, and a full reading workflow for bookmarks, annotations, and progress sync.

## Stack

- `apps/web`: React 19 + Vite + React Router + React Query + Framer Motion + `epubjs` + `react-pdf`
- `apps/api`: Fastify + Prisma + SQLite + JWT + multipart uploads
- `packages/contracts`: shared Zod schemas and TypeScript contracts

## Core Features

- Responsive UI for desktop and mobile
- Apple Books / iOS influenced reading motion and visual language
- Login and account-backed library
- Multi-format ingest: EPUB, PDF, TXT, MD
- Fast EPUB metadata parsing on upload
- Touch-friendly reading controls
- Bookmarks, notes, and reading progress persistence

## Run Locally

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment files:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

3. Generate Prisma client:

```bash
pnpm db:generate
```

4. Push the database schema:

```bash
pnpm db:push
```

`pnpm db:push` now bootstraps the local SQLite file automatically on first run.

5. Seed a demo user if you want one:

```bash
pnpm db:seed
```

6. Start both services:

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Run the API in Production Mode

```bash
pnpm --filter @glassleaf/api build
pnpm --filter @glassleaf/api db:push
cd apps/api
NODE_ENV=production node dist/server.js
```

`DATABASE_URL` is currently configured for SQLite by default (`file:./dev.db`), which is convenient for local and small deployments.

For cloud deployments, move to a dedicated PostgreSQL database later by migrating Prisma schema and deployment resources.

## Notes

- The web app defaults to `http://localhost:4000` for the API.
- The API exposes `/health` and versioned routes under `/v1`.
- A local offline fallback layer exists in the web app so the interface can still be explored even if the API is unavailable.

## Online Deployment

### 1) Prepare a Remote API

You can run the API on any Node 24+ host (DigitalOcean, Railway, Render, Azure, a VPS).

- Copy `apps/api/.env.example` to `apps/api/.env` and update these values:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGINS` (comma separated host list, or `*`)
  - `STORAGE_ROOT` (on ephemeral storage choose a mounted persistent volume)

Start with:

```bash
pnpm --filter @glassleaf/api db:push
pnpm --filter @glassleaf/api start
```

Open the `GET /health` endpoint to confirm the service is reachable.

### 2) Point the Frontend to Your API

Set `VITE_API_ORIGIN` to your deployed API origin (no trailing slash), for example:

```
VITE_API_ORIGIN=https://api.example.com
```

For static hosting with GitHub Pages, use repository variables/secrets in CI:

1. Add `VITE_API_ORIGIN` to repository variables.
2. Re-run deployment so `apps/web` gets the production build-time value.
3. Set `CORS_ORIGINS` on the API host to include your pages domain.

### 3) Online Performance Checklist

- Keep uploads below API instance limits.
- Enable gzip/ Brotli and static response caching at your host/proxy layer.
- Keep `readerState` calls as a single source of truth for:
  - book data
  - progress
  - bookmarks
  - annotations
- Use one storage volume for book files and prune stale files by scheduled job if needed.
