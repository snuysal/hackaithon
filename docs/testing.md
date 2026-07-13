# Testing

## Commands

Run all commands from the project root:

```bash
C:\Users\JornevanZanden\CeriosProjects\hackaithon
```

Run the full suite:

```bash
npm run test
```

Run focused suites:

```bash
npm run test:api
npm run test:portal
npm run test:coverage
npm run test:report
```

Generate focused HTML reports:

```bash
npm run test:report:api
npm run test:report:portal
```

`npm run test:report` writes a local UI to `reports/tests/index.html` and also stores the raw JUnit output in `reports/tests/junit.xml`. Open the HTML file in your browser to inspect the results.

## Reading results

Terminal output shows:

- `✔` for successful tests
- `✖` for failed tests
- a summary with totals and duration at the bottom

The HTML report shows:

- a global summary of passed and failed tests
- grouped results per file
- detailed error output for failed tests

Generated files:

- `reports/tests/index.html`
- `reports/tests/junit.xml`

## Current coverage

- Shared business logic in `packages/shared-types`
- API unit tests for parsers, policies, mappers, gamification helpers and services
- HTTP-level Nest controller tests with validation, query parsing and history summary routes
- Frontend tests for router behavior, API/session helpers and core course-card rendering
- Local HTML report generation for browsing test results outside the terminal

## Extending the suite

- Add new backend unit tests next to the module they cover as `*.test.ts`
- Add new HTTP-level controller tests as `*.e2e.test.ts`
- Add frontend tests next to the component or helper they cover
- The root runner automatically discovers every `*.test.ts` and `*.test.tsx` file under `apps/` and `packages/`
