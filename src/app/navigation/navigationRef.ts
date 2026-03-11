import { CommonActions, createNavigationContainerRef } from "@react-navigation/native"

import type { RootStackParamList } from "@/app/navigation/types"

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

export function resetToAuthStack() {
  if (!navigationRef.isReady()) return

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "AuthStack", params: { screen: "LoginScreen" } }],
    }),
  )
}

export function resetToMainTabs() {
  if (!navigationRef.isReady()) return

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
    }),
  )
}

export function resetToSupport(reason?: string) {
  if (!navigationRef.isReady()) return

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "SupportStack", params: { screen: "SupportPlaceholder", params: { reason } } }],
    }),
  )
}
