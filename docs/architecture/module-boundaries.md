# Module Boundaries

## Purpose

Define the enforced dependency rules between top-level source directories. These rules prevent coupling that makes the codebase hard to change and test independently.

Violations are detected automatically by `scripts/verify-repo-standards.mjs` and block `npm run lint`.

---

## Allowed Dependency Direction

```
app  ──►  features
app  ──►  shared
app  ──►  domains
app  ──►  plugins

features  ──►  shared
features  ──►  domains

domains   ──►  shared

plugins   ──►  shared

shared    ──►  shared   (within subdirectories only)
```

All arrows point in one direction. No reverse edges are allowed.

---

## Prohibited Imports

| File location | Must NOT import from |
|---|---|
| `src/shared/**` | `src/features/**` |
| `src/shared/**` | `src/app/**` |
| `src/domains/**` | `src/features/**` |
| `src/plugins/**` | `src/features/**` |
| `src/features/A/**` | `src/features/B/**` |

Cross-feature imports (`feature-A` → `feature-B`) are the most common violation. They create hidden coupling that makes it expensive to refactor, test, or delete a feature.

---

## Handling Shared Logic

When two features need the same behaviour, choose one of the following in order of preference:

1. **Extract to `src/shared/`** — only when the abstraction is genuinely reusable and has at least two callers from different features.
2. **Extract to `src/domains/`** — for domain logic that is wallet-specific but not tied to a single feature.
3. **Duplicate locally** — if the abstraction is small and unlikely to stay in sync, duplication is safer than premature sharing.

Do not add a cross-feature import as a shortcut to avoid one of the above options.

---

## Legacy Allowlist

The file `scripts/verify-repo-standards.mjs` contains a `LEGACY_CROSS_FEATURE_ALLOWLIST` set. Entries in this set are existing violations that predate this rule. They are permitted to pass CI temporarily but must not grow.

Guidelines for the allowlist:

- Do not add new entries without a documented plan to remove them.
- When refactoring removes an entry, delete it from the set in the same pull request.
- The allowlist is the authoritative record of known boundary debt.

---

## Enforcement

The check runs as part of `npm run check:repo`, which is included in `npm run lint`.

To run the boundary check in isolation:

```sh
node scripts/verify-repo-standards.mjs
```

A violation looks like:

```
Architecture violations:
- src/features/orders/screens/OrderDetailScreen.tsx must not import @/features/home/...
```

Fix by extracting the shared dependency to `src/shared/` or rerouting through `src/app/`.

---

## Public Module Surface

Each feature directory should expose its public interface through a top-level `index.ts`. Internal implementation files are not part of the public surface and should not be imported directly by callers outside the feature.

This convention is not yet enforced automatically. It is a required pattern for new features added after this document was introduced.

```
src/features/auth/
  components/       ← internal
  screens/          ← internal
  services/         ← internal
  hooks/            ← internal
  index.ts          ← public surface: only re-export what callers need
```

Existing features without `index.ts` are tracked as technical debt.
