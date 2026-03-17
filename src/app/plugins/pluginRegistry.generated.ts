import { copouchPluginManifest } from "@/plugins/copouch/manifest"
import type { PluginId, PluginManifest } from "@/shared/plugins/types"

export const pluginRegistry = {
  copouch: copouchPluginManifest,
} satisfies Record<PluginId, PluginManifest>
