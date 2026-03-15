# Integration Tests

Integration tests verify contracts across multiple modules without placing those tests inside production directories.

## Directory Rules

```text
tests/integration/
  setup.ts
  app/
  shared/
    api/
    i18n/
    session/
    storage/
    theme/
  features/
  app/
  test-helpers/
```

Use the same ownership model as the runtime code:

- `shared/`: API, storage, session, theme, native adapters, and reusable infrastructure
- `features/<feature>/`: feature flows that span screens, services, and stores
- `app/`: composition-root behavior such as bootstrapping, navigation, and providers
- `test-helpers/`: reusable harnesses, fake clients, and fixtures

## Authoring Rules

1. Keep unit tests out of this directory.
2. Prefer black-box expectations over implementation-detail assertions.
3. Mock native modules in `setup.ts` unless a suite needs a dedicated helper.
4. Keep fixtures lightweight and local to the suite or `test-helpers/`.
5. Name files by workflow or contract, for example `auth-session-interceptors.integration.test.ts`.

## Current Example Suites

- `shared/api/auth-session-interceptors.integration.test.ts`
- `shared/api/api-error-mapping.integration.test.ts`
- `shared/i18n/i18n-language.integration.test.ts`
- `shared/storage/storage-auth-store.integration.test.ts`
- `shared/theme/theme-persistence.integration.test.ts`
- `features/auth/auth-session-orchestrator.integration.test.ts`
- `features/support/support-navigation.integration.test.ts`
- `app/navigation/bootstrap-run-coordinator.integration.test.ts`
- `app/navigation/navigation-ref-support.integration.test.ts`
