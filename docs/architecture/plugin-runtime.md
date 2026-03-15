# Plugin Runtime Architecture

## Goal

Define a compile-time plugin architecture for `rn_code` so product capabilities such as CoPouch, transfer, and receive can run inside a shared host shell instead of being hard-wired into the root app navigation.

This document focuses on:

- plugin packaging and registration inside the React Native app
- host-owned capability boundaries for wallet-sensitive actions
- a consistent presentation model for plugin entry, close, and exit
- a migration path from the current feature-stack layout

This document does not define:

- backend API contracts
- remote code loading or a marketplace distribution model
- a micro-frontend runtime that downloads JavaScript after install

## Design Summary

The target model is:

- the root app remains the host
- plugins are compiled into the app bundle at build time
- the host exposes a narrow SDK for privileged actions such as signing, transfer submission, user identity, wallet address lookup, and login status
- each plugin renders inside a host-owned container with one close affordance and one exit animation rule
- transfer and receive remain user-facing wallet actions, while their internal domain model is still a cross-chain order exchange flow

In user language:

- users open a wallet action such as `Transfer`, `Receive`, or `CoPouch`
- the app renders a plugin screen
- the plugin asks the host for data and privileged actions
- the host executes sensitive operations and returns results
- the plugin can be closed from the top-right corner and exits by sliding downward

## Why This Model

The current app already separates product domains under `src/features/`, but the root navigation still mounts specific stacks such as `TransferStack`, `ReceiveStack`, and `CopouchStack` directly. That works for a small set of features, but it does not scale cleanly when more wallet mini-programs are introduced.

The plugin model improves that by making the host responsible for:

- authentication and wallet session truth
- navigation shell and plugin presentation
- permission checks and auditability for sensitive actions
- consistent close behavior and analytics

Each plugin then owns:

- feature-specific UI
- local workflow state
- orchestration of host APIs
- user-facing content and route flow inside the plugin boundary

## Design Principles

1. Build-time registration only.
2. No plugin gets direct access to private keys or low-level wallet internals.
3. The host owns all privileged behavior.
4. User-facing product names stay wallet-native, even when the domain model is a cross-chain order exchange.
5. Plugin presentation is uniform across all plugins.
6. Existing feature modules should be incrementally wrapped, not rewritten from scratch.

## System Model

```text
App Host
  ├─ Auth / Session / Wallet State
  ├─ Root Navigation
  ├─ Plugin Host Container
  ├─ Host SDK
  └─ Build-time Plugin Registry
       ├─ CoPouch Plugin
       ├─ Transfer Plugin
       ├─ Receive Plugin
       └─ Future Plugins
```

## Responsibilities

### Host Responsibilities

The host owns:

- login state and user session truth
- user profile lookup
- wallet address lookup
- scanner, image picker, and address book capabilities
- signing and transaction approval
- transfer or receive intent execution
- permission gating
- analytics, logging, and error boundary behavior
- plugin container rendering and close animation

### Plugin Responsibilities

Each plugin owns:

- business-specific screens and UI
- plugin-local navigation flow
- draft state that is meaningful only inside that plugin
- transforming user input into host SDK requests
- rendering success, error, and empty states

### Strict Boundary

Plugins must not:

- access seed phrases, private keys, or passkey internals
- instantiate their own wallet signing engine
- read auth storage directly
- bypass host permission checks
- own global app navigation outside the plugin container

## Build-Time Registration

The plugin system should be static at build time. The app bundle contains all approved plugins, but the root host does not import every plugin screen manually.

Recommended discovery rule:

- each plugin exposes a manifest at `src/plugins/<plugin-id>/manifest.ts`
- a build script resolves those manifests and generates `src/app/plugins/pluginRegistry.generated.ts`

The generated registry is the only place the host uses to resolve plugin entrypoints.

Example generated output:

```ts
import type { PluginManifest } from "@/shared/plugins/types"

export const pluginRegistry: Record<string, PluginManifest> = {
  copouch: {
    id: "copouch",
    name: "CoPouch",
    version: "1.0.0",
    hostApiVersion: "1",
    permissions: ["auth.status.read", "user.profile.read", "wallet.address.read"],
    load: () => import("@/plugins/copouch/entry"),
    presentation: {
      style: "sheet",
      closeButton: "top-right",
    },
  },
  transfer: {
    id: "transfer",
    name: "Transfer",
    version: "1.0.0",
    hostApiVersion: "1",
    permissions: ["auth.status.read", "wallet.address.read", "wallet.transfer"],
    load: () => import("@/plugins/transfer/entry"),
    presentation: {
      style: "sheet",
      closeButton: "top-right",
    },
  },
}
```

## Plugin Manifest Contract

The manifest should stay intentionally small.

```ts
export type PluginPermission =
  | "auth.status.read"
  | "user.profile.read"
  | "wallet.address.read"
  | "wallet.sign"
  | "wallet.transfer"
  | "wallet.receive"

export interface PluginManifest {
  id: string
  name: string
  version: string
  hostApiVersion: "1"
  permissions: PluginPermission[]
  load: () => Promise<{ default: PluginEntry }>
  presentation: PluginPresentation
}

export interface PluginPresentation {
  style: "sheet" | "fullscreen"
  closeButton: "top-right"
}
```

Manifest fields should answer only these questions:

- what plugin is this
- what host SDK version does it expect
- what privileged abilities does it request
- how should the host present it
- how should the host lazy-load it

Plugin transition behavior is not part of the manifest. The root host defines one shared transition spec for every plugin instance.

## Host SDK Contract

The host SDK is the only privileged bridge a plugin can use.

```ts
export interface HostApi {
  getLoginStatus(): Promise<{ loggedIn: boolean }>
  getUserInfo(): Promise<UserInfo | null>
  getWalletAddresses(): Promise<WalletAddress[]>
  scanCode(input?: { mode?: "camera" | "image" }): Promise<{ value: string } | null>
  pickImage(): Promise<{ uri: string; name?: string; mimeType?: string } | null>
  openAddressBook(input?: { chainType?: "EVM" | "TRON" }): Promise<
    | { action: "selected"; entry: AddressBookEntry }
    | { action: "cleared" }
    | { action: "closed" }
  >

  signMessage(input: SignMessageInput): Promise<SignMessageResult>
  signTransaction(input: SignTransactionInput): Promise<SignTransactionResult>

  createTransferIntent(input: TransferIntent): Promise<TransferIntentResult>
  createReceiveIntent(input: ReceiveIntent): Promise<ReceiveIntentResult>

  close(result?: PluginCloseResult): void
}

export interface PluginContext {
  pluginId: string
  host: HostApi
  route: {
    params?: Record<string, string | number | boolean | null | undefined>
  }
}

export type PluginEntry = (context: PluginContext) => React.ReactElement
```

## Permission Model

Permission checks are host-side and declarative.

Recommended baseline permissions:

- `auth.status.read`
- `user.profile.read`
- `wallet.address.read`
- `wallet.sign`
- `wallet.transfer`
- `wallet.receive`

Rules:

- a plugin may request only the minimum permissions it needs
- the host validates permissions before mount
- unsupported permissions fail fast during development and during app boot checks
- analytics should record plugin id plus permissioned action name for sensitive calls

## Presentation Rules

All plugins should render through one host-owned container component.

Required rules:

- a close button is always shown in the top-right corner
- the host, not the plugin, owns the close affordance
- plugin close always funnels through `host.close()`
- enter and exit animations are defined centrally by the host, not by individual plugins
- the current root-project spec is `slide-left` on open and `slide-right` on close

This preserves a stable mental model:

- open feels like a wallet tool sliding into focus
- close feels like dismissing a temporary tool from top to bottom

Recommended container responsibilities:

- safe-area handling
- loading fallback while the plugin entry is imported
- error boundary around plugin rendering
- overlay and animation control
- a normalized title area when the plugin opts into one
- keep the previous host screen visually static underneath the plugin layer during open and close

## Transfer And Receive As Plugins

`Transfer` and `Receive` should remain wallet-native product names because that matches user expectations. Internally, both should still be modeled as specialized flows on top of the same cross-chain order system.

Recommended distinction:

- product layer: `Transfer` and `Receive`
- domain layer: `TransferIntent`, `ReceiveIntent`, and `CrossChainOrder`

This keeps the UX simple while preserving the real business model.

### Transfer Plugin

The transfer plugin is responsible for:

- recipient input
- token selection
- quote and route display
- transfer confirmation UI
- handing the final intent to the host

The host remains responsible for:

- account truth
- signature request
- final transaction execution
- result persistence and analytics

### Receive Plugin

The receive plugin is responsible for:

- chain or route selection
- displaying the active receive address or QR code
- generating a receive order request
- rendering receive logs and share affordances

The host remains responsible for:

- user identity and wallet context
- receive intent creation
- permission checks
- any future signing or guarded side effect

## Recommended Runtime Flow

```text
1. User taps a wallet action entry.
2. Host resolves the plugin id from the generated registry.
3. Host validates host API version and declared permissions.
4. Host renders the plugin container.
5. Host lazy-loads the plugin entry.
6. Plugin uses HostApi to query session, addresses, and privileged actions.
7. Plugin finishes, fails, or the user taps close.
8. Host runs the root-defined exit transition and unmounts the plugin.
```

## Recommended Directory Layout

The plugin system should fit the current repository layout instead of introducing a parallel architecture.

```text
src/
  app/
    navigation/
    plugins/
      PluginHostScreen.tsx
      PluginContainer.tsx
      pluginRegistry.generated.ts
      pluginRegistry.ts
  plugins/
    copouch/
      CopouchStackNavigator.tsx
      components/
      screens/
      services/
      store/
      entry.tsx
      manifest.ts
    transfer/
      TransferStackNavigator.tsx
      screens/
      services/
      store/
      utils/
      entry.tsx
      manifest.ts
    receive/
      ReceiveStackNavigator.tsx
      components/
      screens/
      services/
      store/
      utils/
      entry.tsx
      manifest.ts
      ReceivePluginNavigator.tsx
      ReceiveSelectNetworkScreen.tsx
  shared/
    exchange/
      services/
      utils/
    plugins/
      hostApi.ts
      permissions.ts
    receive/
      services/
      types.ts
```

Shared presentation primitives and cross-plugin domain logic must live outside `src/plugins/` once they are used by more than one plugin or by both host and plugin flows.

## Navigation Implications

Today the root navigator mounts dedicated stacks such as `TransferStack`, `ReceiveStack`, and `CopouchStack`. The plugin target state should gradually move toward:

- keep core app routes such as bootstrap, auth, tabs, support, and global orders in root navigation
- replace direct feature-stack mounting for pluginized domains with a generic `PluginHostScreen`
- pass initial params as plugin route params instead of directly navigating into feature-specific stack screens from the root

Target shape:

```text
RootNavigator
  ├─ BootstrapGate
  ├─ AuthStack
  ├─ MainTabs
  ├─ OrdersStack
  ├─ SupportStack
  └─ PluginHostScreen
```

That keeps the root navigation thin and prevents each new mini-program from adding another top-level stack.

## Migration Plan For Existing Features

### Phase 1: Wrap Existing Domains

Create plugin manifests and entry files for:

- `src/plugins/copouch`
- `src/plugins/transfer`
- `src/plugins/receive`

At this stage, plugin entries may still delegate to plugin-owned stack navigators while preserving the existing business flow.

### Phase 2: Move Plugin-Owned Code

Move plugin-owned code under `src/plugins/<plugin-id>/`, including:

- stack navigators
- plugin-specific screens
- plugin-specific services and stores
- plugin-local utilities and components

Keep only shared host concerns and clearly reusable primitives outside the plugin directories.

### Phase 3: Add Host Container

Introduce:

- `src/app/plugins/PluginHostScreen.tsx`
- `src/app/plugins/PluginContainer.tsx`
- `src/shared/plugins/*`

Move close affordance and close animation into the host container.

### Phase 4: Route Through Plugin IDs

Replace direct root navigation to feature stacks with calls such as:

```ts
navigation.navigate("PluginHost", {
  pluginId: "transfer",
  params: { source: "home-shortcut" },
})
```

### Phase 5: Shrink Root Navigation Surface

Once migration stabilizes:

- keep feature-internal routing inside the plugin
- remove redundant root-level plugin stacks
- standardize analytics around plugin lifecycle and permission usage

## Guardrails

The following constraints should stay explicit:

- no remote plugin download in the current architecture
- no host API method should expose raw private key material
- all plugin close behavior must remain host-owned
- transfer and receive should not be renamed into technical cross-chain terminology at the top-level product surface
- plugins should prefer high-level intent APIs over low-level signing APIs whenever a safe abstraction exists

## Open Decisions

The following items still need implementation decisions when the architecture is coded:

1. Whether plugin-internal navigation uses nested React Navigation stacks or local state machines.
2. Whether the build-time registry is generated by a script or maintained manually first and generated later.
3. Whether plugin permissions are enforced only at runtime or also by static checks in CI.
4. Whether `Orders` stays outside the plugin model permanently or also becomes a plugin later.

## Recommended Next Step

Start by pluginizing `CoPouch`, `Transfer`, and `Receive` only. They already exist as clear feature slices, they map cleanly to the wallet mini-program mental model, and they exercise the most important host SDK boundaries:

- session lookup
- wallet address lookup
- guarded signing
- transfer or receive intent creation
- consistent close and exit presentation
