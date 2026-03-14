import { CommonActions, createNavigationContainerRef } from "@react-navigation/native"

import { getCurrentRootRouteDescriptor, type RootRouteDescriptor } from "@/app/navigation/routeDescriptor"
import { resolveSupportRoute, type SupportRouteName } from "@/features/support/utils/supportRoutes"
import { useNavigationStateStore } from "@/shared/store/useNavigationStateStore"

import type { RootStackParamList } from "@/app/navigation/types"
import type { SupportStackParamList } from "@/app/navigation/types"

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

type SupportStackRouteParams = RootStackParamList["SupportStack"]

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

  resetToRootRoute({
    name: "SupportStack",
    params: route as SupportStackRouteParams,
  })
}

export function resetToRootRoutes(routes: RootRouteDescriptor[], index = routes.length - 1) {
  if (!navigationRef.isReady() || routes.length === 0) return

  const targetIndex = Math.min(Math.max(index, 0), routes.length - 1)

  navigationRef.dispatch(
    CommonActions.reset({
      index: targetIndex,
      routes,
    }),
  )
}

export function resetToRootRoute<T extends keyof RootStackParamList>(route: RootRouteDescriptor<T>) {
  resetToRootRoutes([route], 0)
}

export function resetToSupportScreen<T extends SupportRouteName>(screen: T, params?: SupportStackParamList[T]) {
  resetToRootRoute({
    name: "SupportStack",
    params: (params === undefined ? { screen } : { screen, params }) as SupportStackRouteParams,
  })
}

export function getCurrentRouteDescriptor() {
  return getCurrentRootRouteDescriptor(navigationRef.getRootState())
}

export function resetToRecoverableRoute() {
  const route = useNavigationStateStore.getState().recoverableRoute
  if (!route) {
    return false
  }

  resetToRootRoute(route)
  return true
}
