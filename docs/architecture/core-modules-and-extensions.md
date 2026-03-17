# Core Modules And Extensions

## Decision

Transfer and receive are core wallet modules. They open through dedicated root stacks and do not use `PluginHost`.

CoPouch remains an extension-style module. It can still use `PluginHost` because it behaves like a distinct product surface with its own workflow rules.

## Product Logic

- Users understand transfer, receive, orders, and address book as the wallet itself.
- CoPouch is collaborative business logic layered on top of the wallet.
- Capability access and CoPouch approval rules are different concerns and should not share the same abstraction.

## Architecture Rules

- `TransferStack` and `ReceiveStack` are core navigation stacks.
- `PluginHost` is reserved for extension modules only.
- `PluginId` now models extension IDs only.
- Opening transfer and receive should use `openTransferModule`, `openScannedTransferModule`, or `openReceiveModule`.
- CoPouch governance, approval, and collaboration policies should stay inside the CoPouch domain instead of being inferred from plugin permissions.

## Current Layout

- `src/domains/wallet/transfer`
- `src/domains/wallet/receive`
- `src/domains/wallet/shared`
- `src/plugins/copouch`

Core wallet flows now live under `domains/wallet`, while extension-style modules remain under `plugins`.

## Wallet Shared Layer

`src/domains/wallet/shared` should hold wallet-domain shared capabilities only, for example:

- formatting helpers used by both transfer and receive
- order detail navigation helpers that jump into the shared orders stack
- wallet-specific order presentation mapping used by transfer and receive screens
