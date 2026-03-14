# Tests

This repository uses a split test layout:

- unit tests stay next to the code they validate
- integration tests live outside `src/`
- end-to-end tests are reserved for device or emulator flows

## Layout

```text
src/**                     Co-located unit tests with production code
tests/
  integration/
    setup.ts               Shared integration-test mocks and global setup
    shared/                Cross-cutting integration suites
    features/              Feature-owned integration suites
    test-helpers/          Reusable integration-test harnesses
e2e/                       Future device or black-box scenarios
```

## Naming Rules

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts` or `*.integration.test.tsx`
- E2E scenarios: follow the tool-specific naming once E2E tooling is added

## When to Use Each Layer

### Unit tests

Use unit tests for one module at a time:

- pure utilities
- hooks with isolated behavior
- single stores
- isolated components

Place them next to the source file in `src/**`.

### Integration tests

Use integration tests when the value comes from multiple modules working together:

- storage plus store hydration
- request interceptors plus session cleanup
- app bootstrapping or provider composition
- cross-file feature flows that should stay outside production directories

Place them in `tests/integration/**`.

### End-to-end tests

Use E2E tests for:

- device navigation journeys
- native capability checks
- release-blocking black-box flows

Place them in `e2e/**`.

## Commands

- `npm run test:unit`
- `npm run test:integration`
- `npm test`

## Maintenance Rule

When adding a new suite, keep the directory name aligned with the runtime ownership:

- `tests/integration/shared/` for cross-cutting infrastructure
- `tests/integration/features/<feature>/` for feature-owned flows
- `tests/integration/app/` for boot and navigation wiring
