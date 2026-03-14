# Source Layout

## Goal

Define a repository structure that keeps ownership clear, reduces coupling, and makes the React Native app maintainable as a standalone project.

This document is informed by engineering conventions commonly used in Google-style codebases:

- composition roots stay thin
- dependency direction is explicit
- product domains own their code
- shared code is small and reusable
- repository rules are documented and enforced

## Snapshot

Repository snapshot on 2026-03-15:

- `src/` contains 205 source files
- `src/features/` contains 11 domain directories
- `src/shared/` contains 14 cross-cutting subdomains
- `src/app/` already acts as the composition root

## What Already Aligns Well

### 1. Composition root is separated

`src/app/` contains bootstrapping, providers, and navigation. That is a strong foundation because it keeps app wiring away from product logic.

### 2. Product code is mostly feature-first

`src/features/` groups code by business domain instead of technical layer. This improves discoverability for large mobile apps.

### 3. Shared infrastructure is centralized

`src/shared/` already owns API clients, storage, theme, native adapters, and reusable UI. That boundary is useful when kept strict.

### 4. Tooling is already structured for scale

The repository has TypeScript path aliases, a baseline structure check, and co-located unit tests in critical shared modules.

## Gaps Against the Target Layout

### 1. Screen file granularity is inconsistent

The repository mixes single-screen files such as `LoginScreen.tsx` with grouped files such as `OrderFollowupScreens.tsx` and `SettingsEmailScreens.tsx`. New code should prefer one screen per file so ownership and review scope stay obvious.

### 2. Some naming patterns are inconsistent

Examples such as `copouchOperationShared.tsx` and `settingsShared.tsx` do not follow the same casing conventions as the rest of the repository. Consistent file naming reduces friction in imports and review.

### 3. Public module boundaries are implicit

Most features do not expose a small public surface through `index.ts` entrypoints. That makes it easier for callers to reach into internal implementation files.

### 4. Shared state needs periodic review

`src/shared/store/` contains both clearly cross-cutting state and state that may belong to a specific product domain. That is acceptable temporarily, but domain-specific state should move back into its owning feature when practical.

## Dependency Rules

Allowed dependency direction:

```text
app -> features
app -> shared
features -> shared
shared -> shared
```

Disallowed dependency direction:

```text
shared -> features
shared -> app
feature-a -> feature-b
```

Exception handling:

- If two features need the same logic, extract it to `shared` only when the abstraction is genuinely reusable.
- If only one feature needs the logic, keep it inside that feature.

## Target Layout

```text
src/
  app/
    navigation/
    providers/
    screens/
  features/
    auth/
      components/
      screens/
      services/
      store/
      utils/
      index.ts
    transfer/
      ...
  shared/
    api/
    config/
    hooks/
    native/
    storage/
    theme/
    ui/
  types/
```

## Required Conventions for New Changes

1. Keep `app/` free of domain logic.
2. Add new business behavior under the owning feature first.
3. Add new shared utilities only after at least two callers justify the abstraction.
4. Prefer one screen or component per file.
5. Keep unit tests next to the code they validate.
6. Put integration tests in `tests/integration/` and future end-to-end suites in `e2e/`.
7. Update `README`, `CONTRIBUTING`, or this document when repository boundaries change.

## Testing Layout

Use a two-tier test placement rule:

- `src/**`: unit tests only
- `tests/integration/**`: cross-module integration tests
- `e2e/**`: full app or device-driven journeys

This keeps production directories small while preserving ownership for unit tests.

## Recommended Follow-up Refactors

1. Split grouped `*Screens.tsx` files into one screen per file.
2. Add feature-level `index.ts` files to define public entrypoints.
3. Review `src/shared/store/` and move domain-owned state back into feature folders where appropriate.
4. Add automated import-boundary checks if cross-feature imports begin to grow.
5. Introduce E2E tooling under `e2e/` when device-level flows need release gating.
