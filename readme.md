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

Preferred local mode with PostgreSQL:

```bash
npm install
npm run db:up
npm run dev:postgres
```

Fallback mode without Docker (SQLite):

```bash
npm install
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

> ⚠️ Warning: an irresponsible number of tokens will be consumed during this event. They knew what they signed up for.

---

*No perfect results expected. Much insight guaranteed.*
