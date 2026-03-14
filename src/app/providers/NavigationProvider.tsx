import React, { type PropsWithChildren, useEffect, useRef, useState } from "react"

import { DefaultTheme } from "@react-navigation/native"
import { NavigationContainer } from "@react-navigation/native"
import { Linking, useColorScheme } from "react-native"

import { describeRootRouteDescriptor, type RootRouteDescriptor } from "@/app/navigation/routeDescriptor"
import { resolveDeepLink } from "@/app/navigation/deepLinkRouting"
import { getCurrentRouteDescriptor, navigationRef, resetToAuthStack, resetToRootRoutes, resetToSupportScreen } from "@/app/navigation/navigationRef"
import { setNetworkUnavailableHandler, setUnauthorizedHandler } from "@/shared/api/interceptors"
import { getString, removeItem, setBoolean, setString } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useNavigationStateStore } from "@/shared/store/useNavigationStateStore"
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

  const processUrl = (url: string | null) => {
    if (!url || !bootstrappedRef.current || !navigationReadyRef.current || !navigationRef.isReady()) {
      return false
    }

    const resolution = resolveDeepLink(url, authenticatedRef.current)
    if (resolution.pendingProtectedUrl) {
      setPendingProtectedUrl(resolution.pendingProtectedUrl)
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
      setString(KvStorageKeys.OriginalTargetPath, targetPath)
      setBoolean(KvStorageKeys.WechatInterceptorShown, true)
    }

    resetToRootRoutes(resolution.routes, resolution.index)
    return true
  }

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
  }, [setPendingProtectedUrl, setRecoverableRoute])

  useEffect(() => {
    bootstrappedRef.current = isBootstrapped
    authenticatedRef.current = authenticated
    navigationReadyRef.current = navigationReady

    if (authenticated && pendingProtectedUrl) {
      setPendingProtectedUrl(null)

      if (!processUrl(pendingProtectedUrl)) {
        setPendingProtectedUrl(pendingProtectedUrl)
      } else if (getString(KvStorageKeys.OriginalTargetPath) === pendingProtectedUrl) {
        removeItem(KvStorageKeys.OriginalTargetPath)
        removeItem(KvStorageKeys.WechatInterceptorShown)
      }
      return
    }

    if (pendingUrlRef.current && processUrl(pendingUrlRef.current)) {
      pendingUrlRef.current = null
    }
  }, [authenticated, isBootstrapped, navigationReady, pendingProtectedUrl, setPendingProtectedUrl])

  useEffect(() => {
    let mounted = true

    void Linking.getInitialURL().then(url => {
      if (!mounted || !url) {
        return
      }

      pendingUrlRef.current = url
      if (processUrl(url)) {
        pendingUrlRef.current = null
      }
    })

    const subscription = Linking.addEventListener("url", event => {
      pendingUrlRef.current = event.url
      if (processUrl(event.url)) {
        pendingUrlRef.current = null
      }
    })

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  return (
    <NavigationContainer
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
