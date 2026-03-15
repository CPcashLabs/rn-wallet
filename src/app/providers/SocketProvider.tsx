import React, { type PropsWithChildren, useCallback, useEffect, useRef } from "react"

import { AppState, type AppStateStatus } from "react-native"

import { resolveWebSocketUrl } from "@/shared/config/runtime"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { websocketAdapter } from "@/shared/native/websocketAdapter"
import { authenticateSocketConnection, isInternalSocketEvent } from "@/app/providers/socketAuth"
import { invalidateReconnectAttempt, scheduleReconnectAttempt } from "@/app/providers/socketReconnect"

const RECONNECT_DELAY_MS = 1_500

function isForeground(status: AppStateStatus) {
  return status === "active"
}

function parseSocketPayload(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { type?: unknown; data?: unknown }

    if (parsed && typeof parsed === "object") {
      return {
        type: typeof parsed.type === "string" ? parsed.type : undefined,
        payload: "data" in parsed ? parsed.data : parsed,
      }
    }
  } catch {
    // Ignore malformed payloads and surface the raw string instead.
  }

  return {
    type: undefined,
    payload: raw,
  }
}

export function SocketProvider({ children }: PropsWithChildren) {
  const accessToken = useAuthStore(state => state.session?.accessToken ?? null)
  const isBootstrapped = useAuthStore(state => state.isBootstrapped)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectGenerationRef = useRef(0)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const accessTokenRef = useRef<string | null>(accessToken)
  const shouldReconnectRef = useRef(false)

  const invalidateReconnect = useCallback(() => {
    invalidateReconnectAttempt(reconnectTimerRef, reconnectGenerationRef)
  }, [])

  const authenticateSocket = useCallback(async () => {
    const reconnectGeneration = reconnectGenerationRef.current
    const socketStore = useSocketStore.getState()
    const authenticated = await authenticateSocketConnection(websocketAdapter, accessTokenRef.current)

    if (reconnectGeneration !== reconnectGenerationRef.current) {
      return
    }

    if (authenticated) {
      socketStore.setConnected(true)
      return
    }

    socketStore.setConnected(false)
  }, [])

  const scheduleReconnect = useCallback(() => {
    scheduleReconnectAttempt({
      delayMs: RECONNECT_DELAY_MS,
      timerRef: reconnectTimerRef,
      generationRef: reconnectGenerationRef,
      canReconnect: () =>
        Boolean(shouldReconnectRef.current && accessTokenRef.current && isForeground(appStateRef.current)),
      onReconnect: () => {
        void websocketAdapter.connect(resolveWebSocketUrl())
      },
    })
  }, [])

  const syncConnection = useCallback(() => {
    const shouldConnect = isBootstrapped && Boolean(accessTokenRef.current) && isForeground(appStateRef.current)
    shouldReconnectRef.current = shouldConnect
    invalidateReconnect()

    if (!shouldConnect || !accessTokenRef.current) {
      void websocketAdapter.disconnect()
      useSocketStore.getState().reset()
      return
    }

    void websocketAdapter.connect(resolveWebSocketUrl())
  }, [invalidateReconnect, isBootstrapped])

  useEffect(() => {
    const unsubscribe = websocketAdapter.subscribe(event => {
      const socketStore = useSocketStore.getState()

      switch (event.type) {
        case "open":
          invalidateReconnect()
          void authenticateSocket()
          return
        case "message": {
          const parsed = parseSocketPayload(event.data)
          if (isInternalSocketEvent(parsed.type)) {
            return
          }

          socketStore.touchEvent(parsed)
          return
        }
        case "error":
          socketStore.setConnected(false)
          return
        case "close":
          socketStore.setConnected(false)
          scheduleReconnect()
          return
      }
    })

    return () => {
      invalidateReconnect()
      unsubscribe()
    }
  }, [authenticateSocket, invalidateReconnect, scheduleReconnect])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextState => {
      appStateRef.current = nextState
      syncConnection()
    })

    return () => {
      shouldReconnectRef.current = false
      invalidateReconnect()
      subscription.remove()
      void websocketAdapter.disconnect()
      useSocketStore.getState().reset()
    }
  }, [invalidateReconnect, syncConnection])

  useEffect(() => {
    accessTokenRef.current = accessToken
    syncConnection()
  }, [accessToken, syncConnection])

  return children
}
