import { pluginRegistry as generatedPluginRegistry } from "@/app/plugins/pluginRegistry.generated"
import type { PluginId } from "@/shared/plugins/types"

export const pluginRegistry = generatedPluginRegistry

export function getPluginManifest(pluginId: PluginId) {
  return pluginRegistry[pluginId]
}
