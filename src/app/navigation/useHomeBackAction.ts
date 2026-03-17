import { useCallback } from "react"

import type { NavigationProp, ParamListBase } from "@react-navigation/native"

import { resetToMainTabs } from "@/app/navigation/navigationRef"

export function useHomeBackAction(navigation: NavigationProp<ParamListBase>) {
  return useCallback(() => {
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
  }, [navigation])
}
