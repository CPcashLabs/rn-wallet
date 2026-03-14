# End-to-End Tests

This directory is reserved for future black-box mobile test suites.

## Scope

Use `e2e/` for:

- device or emulator flows
- native capability verification
- release-gating scenarios

Do not place unit or integration tests here.

## Recommended Future Layout

```text
e2e/
  scenarios/
  fixtures/
  artifacts/
```

Choose the exact file naming and tooling after the project adopts a concrete E2E runner.
