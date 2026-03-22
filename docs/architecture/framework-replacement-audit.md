# Framework Replacement Audit

This document reviews parts of `rn_code` that are currently implemented with custom JS/native infrastructure but would be safer, cheaper, or more maintainable if replaced with mature frameworks or platform-aligned libraries.

The recommendations follow Google-style engineering preferences:

- prefer platform APIs and official frameworks first
- prefer mature, actively maintained libraries over bespoke infrastructure
- avoid rebuilding caching, retries, persistence, or state orchestration when the project already depends on frameworks that solve them

## Current Status

Status updated on March 22, 2026 after the migration work tracked in this audit.

- 1. Completed: avatar selection now uses `react-native-image-picker`, the crop UI is handled by `react-native-zoom-toolkit`, the bitmap crop is applied through `expo-image-manipulator`, and `PersonalScreen` uploads the cropped file URI instead of the original source asset.
- 2. Completed: document export and image selection use `@react-native-documents/picker` and `react-native-image-picker`, remote image rendering uses `expo-image`, and the legacy `CPCashFilePicker` bridge has been removed from the native projects.
- 3. Completed: WebSocket reconnect lifecycle now uses `reconnecting-websocket`; app code only handles auth/app-state gating plus invalidation mapping.
- 4. Completed: API-backed read models were moved onto TanStack Query patterns, and the old order-record cache layers were reduced to a tiny first-page snapshot helper used only for transaction-record placeholder rendering.
- 5. Completed: manual Zustand persistence moved to shared `persist` middleware and MMKV storage adapters.
- 6. Completed for the current product scope: passkey signup remains intentionally disabled, the custom native passkey bridge has been removed, and wallet signing now lives in a dedicated local wallet vault instead of a mixed passkey/local-auth module.
- 7. Completed: toast presentation now delegates queueing, animation, and timing to `react-native-toast-message`.

## Highest Priority

### 1. Avatar crop flow should move to a real image-cropping library

Current implementation:

- `src/features/home/components/ImageCropModal.tsx` implements gesture handling, scaling, framing, and crop math with `PanResponder` and `Animated`
- `src/features/home/screens/PersonalScreen.tsx` receives crop metadata, but the upload step still sends `cropResult.sourceUri` directly
- `src/features/home/services/homeApi.ts` uploads the original file without applying any crop transformation

Why this should be replaced:

- the current flow presents a crop UI but does not actually persist the cropped bitmap
- custom gesture math and image coordinate conversion are difficult to verify across devices and aspect ratios
- mature libraries already solve pixel-accurate crop extraction, EXIF handling, and platform quirks

Recommended replacement:

- primary option: `react-native-image-crop-picker`
- alternative if the team wants separate picker and editor responsibilities: `react-native-image-picker` plus `react-native-photo-manipulator` or a similar maintained image-processing library

### 2. File picker and remote image cache should not stay as bespoke native modules

Current implementation:

- `src/shared/native/nativeFilePickerModule.ts` defines a custom bridge for picking images, exporting files, saving images, and optionally caching remote images
- `ios/CPCashRN/CPCashFilePicker.mm` contains a large mixed-responsibility native module for picker, export, cache, and scan flows
- `android/app/src/main/java/com/cpcashrn/passkey/CPCashFilePickerModule.kt` contains another large native module with a different exported surface
- `src/features/home/services/avatarCache.ts` and `src/shared/ui/networkLogoCache.ts` add another JS cache index layer on top of native file caching

Why this should be replaced:

- the native bridge has grown into a multi-purpose subsystem that is expensive to maintain on both platforms
- the JS API expects `cacheRemoteImage` and `removeCachedImage`, but the Android module currently exports only picker, scanner, save, and export methods
- avatar/logo rendering now depends on both custom file-cache behavior and custom metadata caches instead of a standard image pipeline

Recommended replacement:

- `react-native-image-picker` for image selection
- `react-native-document-picker` for document export/import flows where appropriate
- `expo-image` or `react-native-fast-image` for remote image loading and disk caching

Notes:

- QR scanning on Android already uses Google ML Kit / Google Code Scanner, which is the right direction and should be kept or wrapped more narrowly

### 3. WebSocket lifecycle should use a mature reconnecting client instead of a handwritten state machine

Current implementation:

- `src/shared/native/websocketAdapter.ts` manages a singleton socket, manual heartbeats, listeners, and close semantics
- `src/app/providers/SocketProvider.tsx` adds app-state gating, reconnect attempts, backoff scheduling, and invalidation dispatch
- `src/app/providers/socketReconnect.ts` reimplements exponential backoff and reconnect guards

Why this should be replaced:

- connection setup, heartbeat policy, reconnect policy, and app lifecycle policy are all hand-maintained in multiple layers
- handwritten realtime state machines are fragile and easy to desynchronize during auth refresh, foreground/background transitions, and repeated failures
- mature clients already provide reconnect/backoff primitives and clearer ownership boundaries

Recommended replacement:

- `reconnecting-websocket` if the backend uses standard WebSocket frames
- `socket.io-client` if the backend protocol can support Socket.IO semantics
- keep the app-level invalidation mapping, but delegate transport lifecycle to the client library

## Medium Priority

### 4. API-backed Zustand stores should be migrated to TanStack Query patterns

Current implementation:

- `src/shared/store/useBalanceStore.ts` manages request identity, dedupe, loading, refreshing, and local snapshots manually
- `src/domains/wallet/receive/store/useReceiveStore.ts` adds custom abort controllers, custom polling loops, and local orchestration for API-backed state
- `src/features/orders/services/orderRecordsCache.ts` introduces a separate cache layer for fetched records

Why this should be replaced:

- the repository already depends on `@tanstack/react-query`
- some features already use `useQuery`, `useInfiniteQuery`, and `useMutation`, while other API-backed state still rebuilds the same concerns by hand
- duplicated cache and request logic increases inconsistency between modules

Recommended replacement:

- migrate API-backed read models to `useQuery` / `useInfiniteQuery`
- move create/update flows to `useMutation`
- use query invalidation or optimistic updates instead of local cache maps where feasible

### 5. Manual store persistence should move to Zustand middleware

Current implementation:

- `src/shared/store/useAuthStore.ts` manually reads and writes passkey history
- `src/shared/store/useUserStore.ts` manually persists profile state and avatar versioning helpers
- `src/domains/wallet/transfer/store/useTransferDraftStore.ts` manually serializes draft state

Why this should be replaced:

- persistence logic is repeated per store
- storage concerns are mixed into business-state reducers
- Zustand already provides `persist` middleware, which better matches the chosen state framework

Recommended replacement:

- `zustand/middleware/persist`
- a shared MMKV storage adapter via `createJSONStorage`

### 6. Passkey support should not expand around the current custom local vault

Current implementation:

- `src/shared/native/passkeyAdapter.ts` disables passkey actions entirely because the current JS-side signing approach is not hardware-backed
- `src/shared/native/localAuthVault.ts` maintains local passkey credential metadata, derived private keys, local signing, and wallet broadcasting
- `ios/CPCashRN/CPCashPasskey.mm` and `android/app/src/main/java/com/cpcashrn/passkey/CPCashPasskeyModule.kt` implement custom native passkey bridges

Why this should be replaced:

- the project carries significant custom surface area for passkey flows while the feature is still disabled
- passkey UX depends on official platform frameworks, but wallet-signing behavior is still layered on top with custom JS key material handling
- this is exactly the kind of security-sensitive domain where a mature framework or managed platform should replace bespoke glue

Recommended replacement:

- adopt a maintained React Native passkey wrapper instead of owning the bridge directly
- keep platform-native passkey auth, but move wallet-signing responsibility to a hardware-backed or server-managed design instead of expanding `localAuthVault`

## Lower Priority

### 7. Toast presentation can be delegated to a maintained UI library

Current implementation:

- `src/shared/toast/ToastProvider.tsx` implements queueing, timing, and enter/exit animation manually

Why this can be replaced:

- the component is reasonable, but it is still infrastructure the team must maintain
- toast behavior is a solved problem and does not create product differentiation

Recommended replacement:

- `react-native-toast-message`
- another maintained toast library already aligned with the design system

## Keep As Is

The following choices already align with the intended direction and do not need replacement right now:

- `i18next` and `react-i18next` for localization
- `@tanstack/react-query` where it is already used
- `zustand` as the state container
- Android QR scanning via Google ML Kit / Google Code Scanner
- `react-native-keychain` and `react-native-mmkv` as the base storage primitives

## Suggested Migration Order

1. Replace avatar picking/cropping/upload with a real crop pipeline
2. Replace custom file picker plus image-cache stack with picker and image libraries
3. Replace WebSocket reconnect logic with a maintained client
4. Move API-backed read/write flows to TanStack Query
5. Standardize store persistence through Zustand middleware
6. Revisit passkey architecture before adding more product features on top of the current local vault
