import type { RootStackParamList } from "@/app/navigation/types"

export type RootRouteDescriptor<T extends keyof RootStackParamList = keyof RootStackParamList> = {
  name: T
  params?: RootStackParamList[T]
}

type NavigationRouteLike = {
  name: string
  params?: unknown
  state?: unknown
}

type NavigationStateLike = {
  index?: number
  routes: NavigationRouteLike[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

function isNavigationStateLike(value: unknown): value is NavigationStateLike {
  return isRecord(value) && Array.isArray(value.routes)
}

function getActiveRoute(state: NavigationStateLike | null | undefined) {
  if (!state?.routes.length) {
    return null
  }

  const index = typeof state.index === "number" ? state.index : state.routes.length - 1
  return state.routes[index] ?? state.routes[state.routes.length - 1] ?? null
}

function cloneParams(value: unknown) {
  return isRecord(value) ? { ...value } : undefined
}

function buildNestedParams(route: NavigationRouteLike): Record<string, unknown> | undefined {
  const params = cloneParams(route.params)
  const nestedRoute = getActiveRoute(isNavigationStateLike(route.state) ? route.state : null)

  if (!nestedRoute) {
    return params
  }

  return {
    ...(params ?? {}),
    screen: nestedRoute.name,
    params: buildNestedParams(nestedRoute),
  }
}

export function getCurrentRootRouteDescriptor(state: unknown): RootRouteDescriptor | null {
  if (!isNavigationStateLike(state)) {
    return null
  }

  const route = getActiveRoute(state)
  if (!route) {
    return null
  }

  return {
    name: route.name as keyof RootStackParamList,
    params: buildNestedParams(route) as RootStackParamList[keyof RootStackParamList] | undefined,
  }
}

function appendNestedScreens(parts: string[], params: unknown) {
  if (!isRecord(params) || typeof params.screen !== "string") {
    return
  }

  parts.push(params.screen)
  appendNestedScreens(parts, params.params)
}

export function describeRootRouteDescriptor(route: RootRouteDescriptor | null | undefined) {
  if (!route) {
    return undefined
  }

  const parts = [route.name]
  appendNestedScreens(parts, route.params)
  return parts.join(" > ")
}
