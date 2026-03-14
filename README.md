# CPCash RN

React Native client for **CPCash**, delivering the mobile wallet, payments, receive, orders, and settings experience on iOS and Android.

## Status

This repository is organized as a source-available mobile application with explicit architecture and contribution rules.

## Architecture

The codebase follows a composition-root plus feature-slice layout inspired by Google-style engineering conventions:

- `src/app/` wires providers, navigation, bootstrapping, and top-level composition only.
- `src/features/` owns product domains such as auth, transfer, receive, and settings.
- `src/shared/` contains reusable infrastructure and cross-cutting code that can be consumed by multiple features.
- `src/types/` is reserved for truly global declarations.

Detailed repository rules and gaps are documented in [docs/architecture/source-layout.md](docs/architecture/source-layout.md).

## Repository Layout

```text
android/                  Android native project
ios/                      iOS native project
scripts/                  Repository verification scripts
src/app/                  App shell, providers, root navigation
src/features/             Domain-owned feature modules
src/shared/               Cross-cutting infrastructure and reusable UI
src/types/                Global declarations only
docs/                     Public repository documentation
.github/                  Contribution templates
```

## Tech Stack

| Category | Stack |
| --- | --- |
| Framework | React Native 0.76, React 18 |
| Navigation | React Navigation 7 |
| State | Zustand, TanStack React Query |
| i18n | i18next, react-i18next |
| Crypto / Web3 | ethers, bip39, ethereum-cryptography |
| Storage | react-native-mmkv, react-native-keychain |
| Validation | Zod |
| Language | TypeScript |

## Prerequisites

- Node.js 20 or later
- npm or pnpm
- iOS: Xcode and CocoaPods
- Android: Android Studio, JDK, and Android SDK
- React Native [environment setup](https://reactnative.dev/docs/environment-setup)

## Getting Started

### Install dependencies

```bash
npm install
```

### Install iOS pods

```bash
npm run pods:install
```

### Run locally

```bash
npm start
npm run ios
npm run android
```

## Quality Gates

| Command | Description |
| --- | --- |
| `npm run test:unit` | Run co-located unit tests under `src/**` |
| `npm run test:integration` | Run external integration tests under `tests/integration/**` |
| `npm run typecheck` | Validate TypeScript types |
| `npm run check:wp00` | Validate baseline application bootstrap structure |
| `npm run check:repo` | Validate repository governance and docs layout |
| `npm run lint` | Run repository checks |
| `npm test` | Run unit and integration test suites |

## Test Layout

- Unit tests stay co-located with source code in `src/**` as `*.test.ts` or `*.test.tsx`.
- Integration tests live outside product code in `tests/integration/**` as `*.integration.test.ts`.
- End-to-end tests are reserved for `e2e/**` and should stay black-box and tool-specific.

The repository test topology is documented in [tests/README.md](tests/README.md).

## Documentation

- Architecture: [docs/architecture/source-layout.md](docs/architecture/source-layout.md)
- Repository docs index: [docs/README.md](docs/README.md)
- Test layout: [tests/README.md](tests/README.md)
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Changes that affect navigation, domain boundaries, runtime configuration, or public APIs must update the relevant documentation in the same change.

## License

This repository currently uses [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). See [LICENSE](LICENSE) for the canonical project license notice.
