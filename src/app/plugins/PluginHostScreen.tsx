import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { getPluginManifest } from "@/app/plugins/pluginRegistry"
import { resetToMainTabs, resetToRootRoutes } from "@/app/navigation/navigationRef"
import { PluginContainer } from "@/app/plugins/PluginContainer"
import { PluginErrorBoundary } from "@/app/plugins/PluginErrorBoundary"
import { PluginRuntimeProvider } from "@/shared/plugins/PluginRuntimeProvider"
import { createHostApi } from "@/shared/plugins/hostApi"
import { ToastProvider } from "@/shared/toast/ToastProvider"
import type { PluginCloseResult, PluginEntryComponent, PluginEntryProps } from "@/shared/plugins/types"

import type { RootStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<RootStackParamList, "PluginHost">

export function PluginHostScreen({ navigation, route }: Props) {
  const manifest = getPluginManifest(route.params.pluginId)
  const [EntryComponent, setEntryComponent] = useState<PluginEntryComponent | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [runtimeError, setRuntimeError] = useState<Error | null>(null)
  const [closing, setClosing] = useState(false)
  const closingResultRef = useRef<PluginCloseResult | undefined>(undefined)
  const closeRequestedRef = useRef(false)

  useEffect(() => {
    let active = true

    setEntryComponent(null)
    setLoadError(null)
    setRuntimeError(null)
    setClosing(false)
    closeRequestedRef.current = false
    closingResultRef.current = undefined

    void manifest
      .load()
      .then(module => {
        if (!active) {
          return
        }

        setEntryComponent(() => module.default)
      })
      .catch(error => {
        if (!active) {
          return
        }

        setLoadError(error instanceof Error ? error : new Error("Plugin failed to load."))
      })

    return () => {
      active = false
    }
  }, [manifest])

  const handleRequestClose = (result?: PluginCloseResult) => {
    if (closeRequestedRef.current) {
      return
    }

    closeRequestedRef.current = true
    closingResultRef.current = result
    setClosing(true)
  }

  const handleRuntimeError = useCallback((error: Error) => {
    setRuntimeError(error)
  }, [])

  const hostApi = useMemo(
    () =>
      createHostApi({
        pluginId: manifest.id,
        onRequestClose: handleRequestClose,
      }),
    [manifest.id],
  )

  const context = useMemo(
    () => ({
      pluginId: manifest.id,
      host: hostApi,
      route: {
        params: route.params.pluginParams,
      },
    }),
    [hostApi, manifest.id, route.params.pluginParams],
  )

  const handleClosed = () => {
    void closingResultRef.current

    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    const returnTo = route.params.returnTo
    if (returnTo && returnTo.name !== "PluginHost") {
      resetToRootRoutes([{ name: returnTo.name as keyof RootStackParamList, params: returnTo.params as never }], 0)
      return
    }

    resetToMainTabs()
  }

  const LoadedEntry = EntryComponent as React.ComponentType<PluginEntryProps> | null
  const pluginError = loadError || runtimeError

  return (
    <PluginRuntimeProvider context={context}>
      <ToastProvider>
        <PluginContainer
          closing={closing}
          error={pluginError}
          loading={!LoadedEntry && !pluginError}
          onClosed={handleClosed}
          onRequestClose={() => handleRequestClose({ status: "cancel" })}
          pluginName={manifest.name}
          presentation={manifest.presentation}
        >
          {LoadedEntry ? (
            <PluginErrorBoundary onError={handleRuntimeError}>
              <LoadedEntry context={context} />
            </PluginErrorBoundary>
          ) : null}
        </PluginContainer>
      </ToastProvider>
    </PluginRuntimeProvider>
  )
}
