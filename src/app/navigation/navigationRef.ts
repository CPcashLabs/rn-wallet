import { CommonActions, createNavigationContainerRef } from "@react-navigation/native"

import { resolveSupportRoute, type SupportRouteName } from "@/features/support/utils/supportRoutes"

import type { RootStackParamList } from "@/app/navigation/types"
import type { SupportStackParamList } from "@/app/navigation/types"

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

  const route = resolveSupportRoute(reason)

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "SupportStack", params: route }],
    }),
  )
}

export function resetToSupportScreen<T extends SupportRouteName>(screen: T, params?: SupportStackParamList[T]) {
  if (!navigationRef.isReady()) return

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "SupportStack", params: params === undefined ? { screen } : { screen, params } }],
    }),
  )
}
