import { copouchPluginManifest } from "@/plugins/copouch/manifest"
import { receivePluginManifest } from "@/plugins/receive/manifest"
import { transferPluginManifest } from "@/plugins/transfer/manifest"
import type { PluginId, PluginManifest } from "@/shared/plugins/types"

export const pluginRegistry = {
  copouch: copouchPluginManifest,
  transfer: transferPluginManifest,
  receive: receivePluginManifest,
} satisfies Record<PluginId, PluginManifest>
