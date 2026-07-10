# HACKAITHON ⚡

> "We build things. We break things. We let AI fix things."

**Friday, July 10 · 13:00–20:00 · Cerios HQ Utrecht**
![Hackaithon banner](./hackyton.png)
---

## What even is this?

A hackathon where teams build a full app **and** test it the same afternoon. With AI. While eating free food. No excuses.

Agentic AI writes the code. Playwright MCP runs the browser. You watch in awe and pretend you planned it that way.

## The vibe

- Bugs? The agent analyzes, fixes, tests and validates. You drink coffee.
- Testing? Playwright clicks everything. You watch.
- Done in minutes what used to take days. Classic AI arc.

## Stack

`agentic AI` · `Playwright MCP` · `prompts & skills` · `vibes`

## Run Locally

Prerequisites:

- Node.js 20+
- npm
- Docker Desktop for the preferred PostgreSQL mode

Setup after cloning:

1. Install dependencies.
2. Create the database env file.

Windows PowerShell:

```powershell
npm install
Copy-Item packages/database/.env.example packages/database/.env
```

macOS / Linux:

```bash
npm install
cp packages/database/.env.example packages/database/.env
```

The database env file must contain a `DATABASE_URL`. The default example points to the local Docker PostgreSQL instance.

Preferred local mode with PostgreSQL:

```bash
npm run db:up
npm run dev:postgres
```

Fallback mode without Docker (SQLite):

```bash
npm run dev:local
```

Open:

- Portal: `http://localhost:5173`
- API: `http://localhost:3000`

Default seeded users:

- Admin: `admin@hackaithon.local` / `admin123`
- Trainer: `trainer@hackaithon.local` / `trainer123`

Stop services:

```bash
npm run db:down
```

## Troubleshooting

Prisma `EPERM` on Windows during `npm run db:generate`, `npm run db:push`, or `npm run dev:postgres`:

If you see an error like this:

```text
EPERM: operation not permitted, rename ... query_engine-windows.dll.node
```

then a previous Node/Nest/Vite process is usually still running and locking Prisma's generated engine file.

Fix:

1. Stop any running dev servers.
2. Close old terminals that were running `npm run dev`, `npm run dev:postgres`, or `npm run dev:local`.
3. Start again with:

```bash
npm run db:generate
npm run db:push
npm run dev:postgres
```

If needed, check for leftover Node processes on Windows:

```powershell
Get-Process node
```

> ⚠️ Warning: an irresponsible number of tokens will be consumed during this event. They knew what they signed up for.

---

*No perfect results expected. Much insight guaranteed.*
