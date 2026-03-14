# Contributing to CPCash RN

## Scope

This repository accepts improvements to the React Native client, repository documentation, and development tooling.

## Development Setup

1. Install dependencies with `npm install`.
2. Install iOS pods with `npm run pods:install` when working on iOS.
3. Run `npm run typecheck`, `npm run check:wp00`, and `npm run check:repo` before opening a pull request.
4. Run `npm run test:unit` for local logic changes and `npm run test:integration` for cross-module flows.
5. Run `npm test` before opening a pull request when the change affects shared infrastructure or business workflows.

## Architecture Rules

These rules keep the repository aligned with the source layout described in `docs/architecture/source-layout.md`.

1. `src/app/` is the composition root. It may depend on `features` and `shared`, but product logic should not live here.
2. `src/features/<domain>/` owns domain-specific screens, components, services, hooks, and stores.
3. `src/shared/` is for cross-cutting infrastructure only. Do not move feature-specific logic into `shared` for convenience.
4. Avoid direct imports from one feature into another. Prefer shared abstractions or app-level composition.
5. New screens and components should use one primary export per file. Avoid adding more aggregated `*Screens.tsx` files.
6. Use `PascalCase` for screen and component files, `camelCase` for hooks and utilities, and `kebab-case` for feature directory names.
7. Keep unit tests close to the code they validate with `*.test.ts` or `*.test.tsx`.
8. Place integration tests in `tests/integration/` and future end-to-end suites in `e2e/`.

## Testing Layout

- `src/**`: co-located unit tests for functions, hooks, stores, and isolated UI behavior
- `tests/integration/**`: external integration tests for storage, stores, API glue, app bootstrapping, and cross-module contracts
- `e2e/**`: device or emulator black-box journeys

Follow [tests/README.md](tests/README.md) when adding a new suite or directory.

## Documentation Expectations

Update documentation in the same pull request when you change:

- navigation or route ownership
- runtime configuration or setup instructions
- repository structure or dependency direction
- contributor workflow or security expectations

## Pull Requests

Each pull request should include:

- a short problem statement
- the technical approach
- testing performed
- screenshots or recordings for user-visible UI changes
- docs updates when architecture or workflow changed

## Review Criteria

Changes are reviewed for:

- clear ownership boundaries
- predictable dependency direction
- naming consistency
- minimal public surface area
- adequate tests and docs for the risk level
