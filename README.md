# CPCash React Native

React Native app for CPCash, built as part of the **Vue → React Native** migration. This repo contains the RN shell, shared infrastructure, and incrementally migrated features according to the work packages (WP-xx) defined in the [React Native Translation Master Guide](../docs/react-native-translation-master-guide.md).

## Introduction

CPCash is being reimplemented in React Native to support iOS and Android natively. Migration is done in ordered work packages (WP-00 through WP-13) so that each phase has clear scope, dependencies, and exit criteria. This document summarizes what is **planned**, what is **already implemented** in this repo, and how it fits the overall roadmap.

---

## Planned implementation (roadmap)

The master guide defines **6 phases** and **14 work packages**. Execution order is fixed:

`WP-00 → WP-01 → … → WP-13` (no skipping; parallel work only within the same phase when there are no shared-state conflicts).

| Phase | Work packages | Goal |
|-------|----------------|------|
| **Phase 0** | WP-00 | RN shell, root navigation, auth/session recovery, 401 handling, native capability abstractions |
| **Phase 1** | WP-01, WP-02, WP-03 | Auth (login, Passkey, password, forgot/set password); Home/Me shell and profile; Address book |
| **Phase 2** | WP-04, WP-05, WP-06 | Transfer (address, scan, select token); Order, confirm, pay, Send flow; Receive (normal, business, link, BTT/buy crypto) |
| **Phase 3** | WP-07, WP-08 | Order list, detail, receipt, export; Messages and tag/notes |
| **Phase 4** | WP-09 | Settings, security, invite, email, language, node, help/about |
| **Phase 5** | WP-10, WP-11 | CoPouch list/detail/FAQ; CoPouch member/settings/bills/remind/self-transfer/allocation |
| **Phase 6** | WP-12, WP-13 | Support pages (maintenance, no network, 404, environment); Native capability wrap-up and full regression |

Details for each WP (ReadSet, CodeScope, ExitGate, TestRefs) are in the [master guide](../docs/react-native-translation-master-guide.md).

---

## Currently implemented

What exists in this repo today:

### Phase 0 — WP-00 (foundation)

- **Shell & entry**: React Native app entry, root navigator, bootstrap gate (cold start → login or home).
- **Navigation**: Stack navigators for Auth, Home/Me tabs, Transfer, Receive, Address book, Settings, Support; shared types and deep-link readiness.
- **Providers**: AppProviders, ErrorBoundary, I18n, Navigation, React Query, Zustand store, Theme.
- **Network & session**: API client, interceptors, auth session, 401 handling, language header.
- **Storage**: KV storage, secure storage, session keys.
- **State (Zustand)**: Auth, balance, user, wallet, theme, navigation state, socket, user address book, transfer draft, receive store.
- **Native adapters**: Passkey, file picker, scanner, share, deep link, WebSocket; native modules (Android/iOS) for Passkey, file picker, scanner.
- **Theme & i18n**: Theme tokens, persistence, app theme hook; i18n skeleton and language support.
- **Config**: Runtime config, React Native config; Android and iOS native projects (gradle, Podfile, Info.plist, etc.).

### Phase 1 — WP-01, WP-02, WP-03 (partial)

- **WP-01 (Auth)**: Login, Passkey intro/signup, password login, forgot password (address/email), set password (first / logged-in / forgot); auth API and password validation/crypto.
- **WP-02 (Home / profile)**: Home and Me tab shells, personal screen, settings screen, total assets, update name, export Passkey screen, UserAvatar component, home API.
- **WP-03 (Address book)**: Address book list and edit screens, address book API.

### Phase 2 — WP-04, WP-05, WP-06 (partial)

- **WP-04 (Transfer address & token)**: Transfer address screen, select token screen; transfer API, transfer draft store, address utilities.
- **WP-05 (Order & Send)**: Send entry, send token, transfer confirm, transfer order, payment info, SendCode (cover, detail, logs), TxPayStatus; transfer order API, order and RPC utilities; transfer UI components.
- **WP-06 (Receive)**: Receive home, address list, rare address, invalid address, BTT claim, buy crypto, receive tx logs; receive API and receive store.

### Shared / infra (ongoing)

- **Web3**: Balance service (e.g. `balanceService.ts`).
- **Stores**: Balance, user, and wallet stores updated for current flows.

### Not yet implemented (or only stubbed)

- Full real Passkey/wallet integration and production-ready scan, export, and share flows.
- **WP-07**: Order list, detail, receipt, flow proof, export.
- **WP-08**: Message center, tag/notes.
- **WP-09**: Settings, security, invite (full set).
- **WP-10 / WP-11**: CoPouch.
- **WP-12**: Support pages (maintenance, no network, 404, environment).
- **WP-13**: Native capability wrap-up and full regression.

---

## Getting started

- Install dependencies: `pnpm install` (or `npm install`).
- iOS: `cd ios && pod install`.
- Run: `npx react-native run-ios` or `npx react-native run-android`.

For the exact reading order, code scope, and exit criteria of each work package, use the [React Native Translation Master Guide](../docs/react-native-translation-master-guide.md).
