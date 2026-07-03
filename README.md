# Debugging Arena

Practice debugging real, production-style codebases in the browser. Pick a
broken challenge, reproduce the failure by running its test suite in a live
IDE, ship the fix, and get scored on how you did.

Each challenge is a self-contained sandbox: editable source files, a
read-only Jest test suite, a problem writeup, and progressive hints. Tests
run server-side in an isolated temp directory and stream their output back
to the terminal panel over Server-Sent Events.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + SQLite
- **NextAuth** (credentials / JWT)
- **Monaco** editor (Zustand-backed IDE state)
- **Tailwind** (VSCode-themed)
- **Jest + ts-jest** test runner, spawned per run in a sandbox

## Requirements

- **Node 18–22.** Next 14's dev/build runtime breaks on Node 24, so pin to an
  even LTS ≤ 22.
- A **long-running Node server** for production - see
  [Deployment](#deployment). This is **not** deployable to Vercel/serverless:
  the runner spawns a Jest child process and writes to a temp dir on disk, and
  SQLite needs a persistent file.

## Local development

```bash
npm install
cp .env.example .env        # then fill in NEXTAUTH_SECRET
npx prisma migrate dev      # create the SQLite db + apply migrations
npm prisma deploy
npm run dev
```

Open http://localhost:3000, register an account, and pick a challenge.

Generate a `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

## Deployment

Target a host that runs a persistent Node process with a writable filesystem
and a persistent disk - Render, Railway, Fly.io, a container, or a plain VPS.

**Environment variables** (see `.env.example`):

- `DATABASE_URL` - a SQLite path on a **persistent disk**, e.g.
  `file:/data/prod.db`. Back this file up; it is your entire database.
- `NEXTAUTH_URL` - your public origin, e.g. `https://arena.example.com`.
- `NEXTAUTH_SECRET` - required.
- `ANTHROPIC_API_KEY` - optional; only used by the AI postmortem (not shipped yet).

**Build & run:**

```bash
npm ci                      # postinstall runs `prisma generate`
npx prisma migrate deploy   # apply migrations to the production db
npm run build
npm start
```

> `jest`, `ts-jest`, `typescript`, and the `prisma` CLI are declared as
> **runtime dependencies** on purpose - the test runner needs them at request
> time, so they must survive a production (`--omit=dev`) install. Don't move
> them back to `devDependencies`.

## Project layout

- `src/app` - routes (arena, result, auth, API handlers)
- `src/components/ide` - the browser IDE (editor, tabs, terminal, panels)
- `src/lib/runner` - sandbox materialization + Jest child-process runner
- `src/lib/scoring.ts` - the deterministic 0–100 scoring formula
- `challenges/` - challenge content (source, tests, hints); read from disk,
  excluded from the app's type-check
