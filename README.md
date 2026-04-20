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

## Notes

- The web app defaults to `http://localhost:4000` for the API.
- The API exposes `/health` and versioned routes under `/v1`.
- A local offline fallback layer exists in the web app so the interface can still be explored even if the API is unavailable.
- In this environment, `pnpm db:push` currently returns a Prisma schema engine error, so database table creation may need one more local pass on your machine.
