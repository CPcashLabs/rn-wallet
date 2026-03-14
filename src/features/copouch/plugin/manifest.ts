import type { PluginEntryComponent, PluginManifest } from "@/shared/plugins/types"

export const copouchPluginManifest: PluginManifest = {
  id: "copouch",
  name: "CoPouch",
  version: "1.0.0",
  hostApiVersion: "1",
  permissions: ["auth.status.read", "user.profile.read", "wallet.address.read", "wallet.sign"],
  load: () =>
    Promise.resolve(require("@/features/copouch/plugin/entry") as { default: PluginEntryComponent }),
  presentation: {
    style: "sheet",
    closeButton: "top-right",
    enterAnimation: "slide-up",
    exitAnimation: "slide-right",
  },
}
