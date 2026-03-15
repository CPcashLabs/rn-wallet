import { getCurrentRouteDescriptor, navigateRoot } from "@/app/navigation/navigationRef"
import type { RootStackParamList } from "@/app/navigation/types"
import type { PluginId, PluginReturnTarget, PluginRouteParams } from "@/shared/plugins/types"

export function buildPluginHostParams(input: {
  pluginId: PluginId
  pluginParams?: PluginRouteParams
}): RootStackParamList["PluginHost"] {
  const currentRoute = getCurrentRouteDescriptor()
  const returnTo: PluginReturnTarget | undefined = currentRoute
    ? {
        name: currentRoute.name,
        params: currentRoute.params,
      }
    : undefined

  return {
    pluginId: input.pluginId,
    pluginParams: input.pluginParams,
    returnTo,
  }
}

export function openPluginHost(input: {
  pluginId: PluginId
  pluginParams?: PluginRouteParams
}) {
  return navigateRoot("PluginHost", buildPluginHostParams(input))
}
