import type { PluginEntryComponent, PluginManifest } from "@/shared/plugins/types"

export const receivePluginManifest: PluginManifest = {
  id: "receive",
  name: "Receive",
  version: "1.0.0",
  hostApiVersion: "1",
  permissions: ["auth.status.read", "wallet.address.read", "wallet.receive"],
  load: () =>
    Promise.resolve(require("@/plugins/receive/entry") as { default: PluginEntryComponent }),
  presentation: {
    style: "sheet",
    closeButton: "top-right",
  },
}
