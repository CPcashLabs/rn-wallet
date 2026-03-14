import type { NavigationProp, ParamListBase } from "@react-navigation/native"

import { resetToAuthStack, resetToMainTabs } from "@/app/navigation/navigationRef"
import { useAuthStore } from "@/shared/store/useAuthStore"

export function resetToEntryScreen() {
  if (useAuthStore.getState().session?.accessToken) {
    resetToMainTabs()
    return
  }

  resetToAuthStack()
}

export function goBackOrReset(navigation: Pick<NavigationProp<ParamListBase>, "canGoBack" | "goBack">) {
  if (navigation.canGoBack()) {
    navigation.goBack()
    return
  }

  resetToEntryScreen()
}
