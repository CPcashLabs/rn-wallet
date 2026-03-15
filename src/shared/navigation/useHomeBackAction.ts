import { useCallback } from "react"

import type { NavigationProp, ParamListBase } from "@react-navigation/native"

import { resetToMainTabs } from "@/app/navigation/navigationRef"
import { usePluginRuntime } from "@/shared/plugins/PluginRuntimeProvider"

export function useHomeBackAction(navigation: NavigationProp<ParamListBase>) {
  const pluginRuntime = usePluginRuntime()

  return useCallback(() => {
    if (pluginRuntime) {
      pluginRuntime.host.close({ status: "cancel" })
      return
    }

    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    const parentNavigation = navigation.getParent()
    if (parentNavigation?.canGoBack()) {
      parentNavigation.goBack()
      return
    }

    resetToMainTabs()
  }, [navigation, pluginRuntime])
}
