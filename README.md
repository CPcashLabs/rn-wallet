# CPCash RN

React Native mobile app for **CPCash** — a cross-platform (iOS & Android) crypto wallet and payment experience.

## Features

- **Auth** — Login (Passkey, password), forgot/set password, session recovery
- **Home & Profile** — Me tab, settings, total assets, name/avatar, Passkey export
- **Transfer** — Address input, token selection, send flow, order confirmation, payment status
- **Receive** — Receive home, address list, BTT claim, buy crypto, receive logs
- **Address Book** — List and edit saved addresses
- **CoPouch** — Shared wallet flows (allocation, transfer, operations)
- **Settings** — Email, help, invite, preferences; i18n (en-US / zh-CN)
- **Infrastructure** — API client, 401 handling, secure/KV storage, Zustand + React Query, theme, deep links

## Tech Stack

| Category      | Stack |
|---------------|--------|
| Framework     | React Native 0.76, React 18 |
| Navigation    | React Navigation 7 (stack + bottom tabs) |
| State         | Zustand, TanStack React Query |
| i18n          | i18next, react-i18next |
| Crypto / Web3 | ethers, bip39, ethereum-cryptography |
| Storage       | react-native-mmkv, react-native-keychain |
| Validation    | Zod |
| Language      | TypeScript |

## Prerequisites

- **Node.js** ≥ 20
- **npm** or **pnpm**
- **iOS**: Xcode, CocoaPods
- **Android**: Android Studio, JDK, Android SDK
- **React Native** [environment setup](https://reactnative.dev/docs/environment-setup)

## Getting Started

### Install dependencies

```bash
npm install
# or
pnpm install
```

### iOS

```bash
npm run pods:install
# or with CocoaPods mirror (e.g. China):
npm run pods:install:mirror
```

### Run

```bash
# Start Metro
npm start

# iOS (other terminal)
npm run ios

# Android (other terminal)
npm run android
```

### Scripts

| Command | Description |
|--------|-------------|
| `npm start` | Start Metro bundler |
| `npm run ios` | Run iOS app |
| `npm run android` | Run Android app |
| `npm run pods:install` | Install iOS CocoaPods |
| `npm run typecheck` | Run TypeScript check |
| `npm run lint` | Typecheck + project checks |

## Project Structure

```
src/
├── app/                 # App shell, providers, root navigation
├── features/             # Feature modules
│   ├── auth/            # Login, Passkey, forgot/set password
│   ├── home/            # Home & Me tabs, profile, settings entry
│   ├── settings/        # Settings screens (email, help, invite, preferences)
│   ├── transfer/        # Send, token select, confirm, order, payment
│   ├── receive/         # Receive, BTT, buy crypto
│   ├── address-book/    # Address book list & edit
│   ├── copouch/         # CoPouch (shared wallet)
│   ├── orders/          # Order list & detail
│   ├── messages/        # Message center
│   ├── invite/          # Invite flows
│   └── support/         # Support / error pages
├── shared/               # Shared code
│   ├── api/             # API client, interceptors
│   ├── config/          # Runtime & app config
│   ├── errors/          # Error handling
│   ├── hooks/           # Shared hooks (e.g. usePersistentCountdown)
│   ├── i18n/            # i18n setup, locales (en-US, zh-CN), resources
│   ├── native/          # Native adapters (Passkey, scanner, share, etc.)
│   ├── session/         # Session / auth
│   ├── storage/         # KV, secure storage, session keys
│   ├── store/           # Zustand stores
│   ├── theme/           # Theme tokens, persistence
│   ├── types/           # Shared types
│   ├── ui/              # Shared UI components
│   └── web3/            # Balance & Web3 utilities
└── types/                # Global type definitions
```

## Configuration

- App and API configuration are driven by runtime config and React Native config.
- Android: `android/` (Gradle, manifest).
- iOS: `ios/` (Podfile, Info.plist, Xcode project).

## Contributing

1. Create a branch from `main`.
2. Make changes and run `npm run typecheck` and `npm run lint`.
3. Open a pull request with a clear description of the change.

## License

**[Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)**
