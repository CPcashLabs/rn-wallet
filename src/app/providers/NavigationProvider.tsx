import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from "react"

import { DefaultTheme } from "@react-navigation/native"
import { NavigationContainer } from "@react-navigation/native"
import { useColorScheme } from "react-native"

import { describeRootRouteDescriptor, type RootRouteDescriptor } from "@/app/navigation/routeDescriptor"
import { getCurrentRouteDescriptor, navigationRef, resetToAuthStack, resetToSupportScreen } from "@/app/navigation/navigationRef"
import { useNavigationLinkingBridge } from "@/app/navigation/navigationLinking"
import { drainQueuedNavigationUrls, type QueuedUrlSource } from "@/app/providers/navigationQueue"
import { setNetworkUnavailableHandler, setUnauthorizedHandler } from "@/shared/api/interceptors"
import { getString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { clearPersistedWechatTargetPath, persistWechatTargetPath } from "@/app/navigation/wechatTargetPath"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useNavigationStateStore } from "@/app/navigation/useNavigationStateStore"
import { useThemeStore } from "@/shared/store/useThemeStore"
import { resolveTheme } from "@/shared/theme/resolveTheme"

import type { RootStackParamList } from "@/app/navigation/types"

export function NavigationProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme()
  const themeMode = useThemeStore(state => state.themeMode)
  const isBootstrapped = useAuthStore(state => state.isBootstrapped)
  const authenticated = Boolean(useAuthStore(state => state.session?.accessToken))
  const setLastRouteName = useNavigationStateStore(state => state.setLastRouteName)
  const pendingProtectedUrl = useNavigationStateStore(state => state.pendingProtectedUrl)
  const setPendingProtectedUrl = useNavigationStateStore(state => state.setPendingProtectedUrl)
  const setRecoverableRoute = useNavigationStateStore(state => state.setRecoverableRoute)
  const appTheme = resolveTheme(themeMode, systemScheme)
  const [navigationReady, setNavigationReady] = useState(false)
  const bootstrappedRef = useRef(isBootstrapped)
  const authenticatedRef = useRef(authenticated)
  const navigationReadyRef = useRef(false)
  const pendingUrlRef = useRef<string | null>(null)
  const pendingProtectedUrlRef = useRef(pendingProtectedUrl)

  const syncPendingProtectedUrl = useCallback(
    (url: string | null) => {
      pendingProtectedUrlRef.current = url
      setPendingProtectedUrl(url)
    },
    [setPendingProtectedUrl],
  )

  const handleResolvedPayload = useCallback(
    ({
      resolution,
      source,
      url,
    }: {
      resolution: { routes: RootRouteDescriptor[]; pendingProtectedUrl?: string }
      source: QueuedUrlSource
      url: string
    }) => {
      if (resolution.pendingProtectedUrl) {
        syncPendingProtectedUrl(resolution.pendingProtectedUrl)
      } else if (source === "protected" && pendingProtectedUrlRef.current === url) {
        syncPendingProtectedUrl(null)
        if (getString(KvStorageKeys.OriginalTargetPath) === url) {
          clearPersistedWechatTargetPath()
        }
      }

      const wechatInterceptorRoute = resolution.routes.find((route): route is RootRouteDescriptor<"SupportStack"> => {
        if (route.name !== "SupportStack") {
          return false
        }

        return (route.params as RootStackParamList["SupportStack"] | undefined)?.screen === "WechatInterceptorScreen"
      })
      const targetPath =
        wechatInterceptorRoute?.params?.screen === "WechatInterceptorScreen"
          ? wechatInterceptorRoute.params.params?.targetPath
          : undefined
      if (targetPath) {
        persistWechatTargetPath(targetPath)
      }
    },
    [syncPendingProtectedUrl],
  )

  const { dispatchUrl, linking } = useNavigationLinkingBridge({
    canHandleUrl: () => bootstrappedRef.current && navigationReadyRef.current && navigationRef.isReady(),
    isAuthenticated: () => authenticatedRef.current,
    onResolvedPayload: handleResolvedPayload,
    queuePendingUrl: url => {
      pendingUrlRef.current = url
    },
  })

  const processUrl = useCallback(
    (url: string | null, source: QueuedUrlSource = "incoming") => {
      if (!url) {
        return false
      }

      return dispatchUrl(url, source)
    },
    [dispatchUrl],
  )

  const drainQueuedUrls = useCallback(
    () =>
      drainQueuedNavigationUrls({
        canProcess: () => bootstrappedRef.current && navigationReadyRef.current && navigationRef.isReady(),
        clearPendingIncomingUrl: () => {
          pendingUrlRef.current = null
        },
        getPendingIncomingUrl: () => pendingUrlRef.current,
        getPendingProtectedUrl: () => pendingProtectedUrlRef.current,
        isAuthenticated: () => authenticatedRef.current,
        processUrl,
      }),
    [processUrl],
  )

  useEffect(() => {
    setUnauthorizedHandler(resetToAuthStack)
    setNetworkUnavailableHandler(() => {
      const currentRoute = navigationRef.getCurrentRoute()
      const currentRootRoute = getCurrentRouteDescriptor()

      if (currentRoute?.name === "NoNetworkScreen" || currentRootRoute?.name === "SupportStack") {
        return
      }

      if (currentRootRoute && currentRootRoute.name !== "BootstrapGate") {
        setRecoverableRoute(currentRootRoute)
      }

      resetToSupportScreen("NoNetworkScreen", {
        mode: "details",
        failedPath:
          describeRootRouteDescriptor(currentRootRoute) ??
          currentRoute?.name ??
          useNavigationStateStore.getState().lastRouteName ??
          undefined,
      })
    })

    return () => {
      setUnauthorizedHandler(null)
      setNetworkUnavailableHandler(null)
    }
  }, [setRecoverableRoute])

  useEffect(() => {
    bootstrappedRef.current = isBootstrapped
    authenticatedRef.current = authenticated
    navigationReadyRef.current = navigationReady
    pendingProtectedUrlRef.current = pendingProtectedUrl

    drainQueuedUrls()
  }, [authenticated, drainQueuedUrls, isBootstrapped, navigationReady, pendingProtectedUrl])

  return (
    <NavigationContainer
      linking={linking}
      ref={navigationRef}
      onReady={() => {
        setNavigationReady(true)
        setLastRouteName(navigationRef.getCurrentRoute()?.name ?? null)
        const currentRootRoute = getCurrentRouteDescriptor()
        if (currentRootRoute && currentRootRoute.name !== "SupportStack" && currentRootRoute.name !== "BootstrapGate") {
          setRecoverableRoute(currentRootRoute)
        }
      }}
      theme={{
        ...DefaultTheme,
        dark: appTheme.isDark,
        colors: {
          ...DefaultTheme.colors,
          primary: appTheme.colors.primary,
          background: appTheme.colors.background,
          card: appTheme.colors.surface,
          text: appTheme.colors.text,
          border: appTheme.colors.border,
          notification: appTheme.colors.primary,
        },
      }}
      onStateChange={() => {
        setLastRouteName(navigationRef.getCurrentRoute()?.name ?? null)
        const currentRootRoute = getCurrentRouteDescriptor()
        if (currentRootRoute && currentRootRoute.name !== "SupportStack" && currentRootRoute.name !== "BootstrapGate") {
          setRecoverableRoute(currentRootRoute)
        }
      }}
    >
      {children}
    </NavigationContainer>
  )
}
