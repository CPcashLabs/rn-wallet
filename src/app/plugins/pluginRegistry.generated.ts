import { copouchPluginManifest } from "@/features/copouch/plugin/manifest"
import { receivePluginManifest } from "@/features/receive/plugin/manifest"
import { transferPluginManifest } from "@/features/transfer/plugin/manifest"
import type { PluginId, PluginManifest } from "@/shared/plugins/types"

export const pluginRegistry = {
  copouch: copouchPluginManifest,
  transfer: transferPluginManifest,
  receive: receivePluginManifest,
} satisfies Record<PluginId, PluginManifest>
