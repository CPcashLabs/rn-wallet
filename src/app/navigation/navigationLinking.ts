import React from "react"

import type { InitialState, LinkingOptions } from "@react-navigation/native"
import { Linking } from "react-native"

import { resolveDeepLink, type DeepLinkResolution } from "@/app/navigation/deepLinkRouting"
import type { RootRouteDescriptor } from "@/app/navigation/routeDescriptor"

import type { RootStackParamList } from "@/app/navigation/types"

export type DeepLinkDispatchSource = "incoming" | "protected"

type NavigationBridgePayload = {
  source: DeepLinkDispatchSource
  url: string
}

export type ResolvedNavigationBridgePayload = NavigationBridgePayload & {
  resolution: DeepLinkResolution
  state: InitialState
}

type UseNavigationLinkingBridgeParams = {
  canHandleUrl: () => boolean
  isAuthenticated: () => boolean
  onResolvedPayload: (payload: ResolvedNavigationBridgePayload) => void
  queuePendingUrl: (url: string) => void
}

const INTERNAL_LINKING_PREFIX = "cpcash-nav://"
const INITIAL_URL_TIMEOUT_MS = 150

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

function asRouteParams(value: unknown) {
  return isRecord(value) ? (value as Record<string, unknown>) : undefined
}

function asNestedRouteParams(value: unknown) {
  if (!isRecord(value) || typeof value.screen !== "string") {
    return undefined
  }

  return value as {
    screen: string
    params?: unknown
  } & Record<string, unknown>
}

function stripNestedRouteParams(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const { params: _params, screen: _screen, ...rest } = value

  return Object.keys(rest).length > 0 ? rest : undefined
}

function buildNestedNavigationState(name: string, params?: unknown): InitialState {
  const nestedParams = asNestedRouteParams(params)
  const route = nestedParams
    ? {
        name,
        params: stripNestedRouteParams(params),
        state: buildNestedNavigationState(nestedParams.screen, nestedParams.params),
      }
    : {
        name,
        params: asRouteParams(params),
      }

  if (!route.params) {
    delete route.params
  }

  return {
    index: 0,
    routes: [route],
  }
}

function buildNavigationRoute(route: RootRouteDescriptor): InitialState["routes"][number] {
  const nestedParams = asNestedRouteParams(route.params)

  if (!nestedParams) {
    const params = asRouteParams(route.params)
    return params ? { name: route.name, params } : { name: route.name }
  }

  const params = stripNestedRouteParams(route.params)

  return params
    ? {
        name: route.name,
        params,
        state: buildNestedNavigationState(nestedParams.screen, nestedParams.params),
      }
    : {
        name: route.name,
        state: buildNestedNavigationState(nestedParams.screen, nestedParams.params),
      }
}

export function createInitialNavigationStateFromRouteDescriptors(routes: RootRouteDescriptor[], index = routes.length - 1): InitialState {
  const boundedIndex = Math.min(Math.max(index, 0), Math.max(routes.length - 1, 0))

  return {
    index: boundedIndex,
    routes: routes.map(buildNavigationRoute),
  }
}

export function encodeNavigationBridgeUrl(url: string, source: DeepLinkDispatchSource = "incoming") {
  const searchParams = new URLSearchParams()
  searchParams.set("source", source)
  searchParams.set("url", url)

  return `${INTERNAL_LINKING_PREFIX}resolve?${searchParams.toString()}`
}

export function decodeNavigationBridgePath(path: string): NavigationBridgePayload | null {
  const normalizedPath = path.replace(/^\/+/, "")
  const [pathname, queryString = ""] = normalizedPath.split("?")

  if (pathname !== "resolve") {
    return null
  }

  const searchParams = new URLSearchParams(queryString)
  const url = searchParams.get("url")
  const source = searchParams.get("source")

  if (!url || (source !== "incoming" && source !== "protected")) {
    return null
  }

  return {
    source,
    url,
  }
}

export function resolveNavigationStateFromBridgePath(path: string, authenticated: boolean): ResolvedNavigationBridgePayload | null {
  const payload = decodeNavigationBridgePath(path)

  if (!payload) {
    return null
  }

  const resolution = resolveDeepLink(payload.url, authenticated)

  return {
    ...payload,
    resolution,
    state: createInitialNavigationStateFromRouteDescriptors(resolution.routes, resolution.index),
  }
}

async function getNativeInitialUrl() {
  return Promise.race([
    Linking.getInitialURL(),
    new Promise<null>(resolve => {
      setTimeout(() => resolve(null), INITIAL_URL_TIMEOUT_MS)
    }),
  ])
}

export function useNavigationLinkingBridge({
  canHandleUrl,
  isAuthenticated,
  onResolvedPayload,
  queuePendingUrl,
}: UseNavigationLinkingBridgeParams) {
  const canHandleUrlRef = React.useRef(canHandleUrl)
  const isAuthenticatedRef = React.useRef(isAuthenticated)
  const onResolvedPayloadRef = React.useRef(onResolvedPayload)
  const queuePendingUrlRef = React.useRef(queuePendingUrl)
  const listenerRef = React.useRef<((url: string) => void) | null>(null)

  React.useEffect(() => {
    canHandleUrlRef.current = canHandleUrl
    isAuthenticatedRef.current = isAuthenticated
    onResolvedPayloadRef.current = onResolvedPayload
    queuePendingUrlRef.current = queuePendingUrl
  }, [canHandleUrl, isAuthenticated, onResolvedPayload, queuePendingUrl])

  const dispatchUrl = React.useCallback((url: string, source: DeepLinkDispatchSource = "incoming") => {
    if (!url || !canHandleUrlRef.current()) {
      return false
    }

    const listener = listenerRef.current
    if (!listener) {
      return false
    }

    listener(encodeNavigationBridgeUrl(url, source))
    return true
  }, [])

  const linking = React.useMemo<LinkingOptions<RootStackParamList>>(
    () => ({
      prefixes: [INTERNAL_LINKING_PREFIX],
      getInitialURL: async () => {
        const url = await getNativeInitialUrl()
        if (!url) {
          return undefined
        }

        if (!canHandleUrlRef.current()) {
          queuePendingUrlRef.current(url)
          return undefined
        }

        return encodeNavigationBridgeUrl(url)
      },
      subscribe: listener => {
        listenerRef.current = listener

        const onReceiveUrl = ({ url }: { url: string }) => {
          if (!url) {
            return
          }

          if (!canHandleUrlRef.current()) {
            queuePendingUrlRef.current(url)
            return
          }

          listener(encodeNavigationBridgeUrl(url))
        }

        const subscription = Linking.addEventListener("url", onReceiveUrl)
        const legacyLinking = Linking as typeof Linking & {
          removeEventListener?: (type: "url", handler: (event: { url: string }) => void) => void
        }
        const removeEventListener = legacyLinking.removeEventListener?.bind(legacyLinking)

        return () => {
          if (listenerRef.current === listener) {
            listenerRef.current = null
          }

          if (subscription?.remove) {
            subscription.remove()
            return
          }

          removeEventListener?.("url", onReceiveUrl)
        }
      },
      getStateFromPath: path => {
        const payload = resolveNavigationStateFromBridgePath(path, isAuthenticatedRef.current())

        if (!payload) {
          return undefined
        }

        onResolvedPayloadRef.current(payload)

        return payload.state
      },
    }),
    [],
  )

  return {
    dispatchUrl,
    linking,
  }
}
