# HACKAITHON

> "We build things. We break things. We let AI fix things."

**Friday, July 10 · 13:00-20:00 · Cerios HQ Utrecht**

![Hackaithon banner](./hackyton.png)

---

## What even is this?

A hackathon where teams build a full app and test it the same afternoon. With AI. While eating free food. No excuses.

Agentic AI writes the code. You steer, validate and ship.

## Stack

- TypeScript monorepo
- React frontend
- NestJS API
- Prisma
- PostgreSQL
- Shared packages

## Gamification

- Learners earn badges while they progress through sections and completed courses
- A live streak rewards consecutive learning days
- The dashboard highlights points, unlocked badges and the next milestone

## Quiz assessment

- Multiple-choice answers are checked and scored by the API; clients cannot submit their own score or correct status.
- A learner passes an e-learning with at least 70% correct multiple-choice answers.
- Wrong and unanswered quiz questions are shown after an unsuccessful attempt and can be retried separately.
- Open questions are saved but are not included in the assessment yet.

## Run locally

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

Fallback mode without Docker:

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

Default onboarding e-learnings:

- `Werken met Cerios Academy` is available to trainers and admins and explains navigation, content creation, publishing and user management.
- `Welkom bij Cerios Academy` is available to participants and explains the dashboard, catalog, learning flow and gamification.
- Published e-learnings are filtered by audience. Content managers select `Students`, `Trainers and admins` or `Everyone` in the e-learning editor.

Stop services:

```bash
npm run db:down
```

## Testing

Run the full test suite:

```bash
npm run test
```

Run focused suites:

```bash
npm run test:api
npm run test:portal
npm run test:coverage
```

Generate a local HTML report:

```bash
npm run test:report
```

Generate focused HTML reports:

```bash
npm run test:report:api
npm run test:report:portal
```

Where to find the report:

- HTML UI: `reports/tests/index.html`
- Raw JUnit XML: `reports/tests/junit.xml`

Open `reports/tests/index.html` in your browser to inspect passed and failed tests per file.

More detail is available in [docs/testing.md](./docs/testing.md).

## Useful commands

```bash
npm run compile
npm run lint
npm run format
```

---

*No perfect results expected. Much insight guaranteed.*
