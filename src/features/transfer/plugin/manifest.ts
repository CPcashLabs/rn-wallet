import type { PluginEntryComponent, PluginManifest } from "@/shared/plugins/types"

export const transferPluginManifest: PluginManifest = {
  id: "transfer",
  name: "Transfer",
  version: "1.0.0",
  hostApiVersion: "1",
  permissions: ["auth.status.read", "wallet.address.read", "wallet.sign", "wallet.transfer"],
  load: () =>
    Promise.resolve(require("@/features/transfer/plugin/entry") as { default: PluginEntryComponent }),
  presentation: {
    style: "sheet",
    closeButton: "top-right",
    enterAnimation: "slide-up",
    exitAnimation: "slide-right",
  },
}
