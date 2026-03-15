import React, { type PropsWithChildren, useEffect, useRef } from "react"

import { AppState, type AppStateStatus } from "react-native"

import { resolveWebSocketUrl } from "@/shared/config/runtime"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { websocketAdapter } from "@/shared/native/websocketAdapter"
import { authenticateSocketConnection, isInternalSocketEvent } from "@/app/providers/socketAuth"

const RECONNECT_DELAY_MS = 1_500

function isForeground(status: AppStateStatus) {
  return status === "active"
}

function clearReconnectTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (!timerRef.current) {
    return
  }

  clearTimeout(timerRef.current)
  timerRef.current = null
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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const accessTokenRef = useRef<string | null>(accessToken)
  const shouldReconnectRef = useRef(false)

  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    const authenticateSocket = async () => {
      const socketStore = useSocketStore.getState()
      const authenticated = await authenticateSocketConnection(websocketAdapter, accessTokenRef.current)
      if (authenticated) {
        socketStore.setConnected(true)
        return
      }

      socketStore.setConnected(false)
    }

    const scheduleReconnect = () => {
      if (reconnectTimerRef.current || !shouldReconnectRef.current || !accessTokenRef.current) {
        return
      }

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null

        if (!shouldReconnectRef.current || !accessTokenRef.current || !isForeground(appStateRef.current)) {
          return
        }

        void websocketAdapter.connect(resolveWebSocketUrl())
      }, RECONNECT_DELAY_MS)
    }

    const unsubscribe = websocketAdapter.subscribe(event => {
      const socketStore = useSocketStore.getState()

      switch (event.type) {
        case "open":
          clearReconnectTimer(reconnectTimerRef)
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
      clearReconnectTimer(reconnectTimerRef)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const syncConnection = () => {
      const shouldConnect = isBootstrapped && Boolean(accessTokenRef.current) && isForeground(appStateRef.current)
      shouldReconnectRef.current = shouldConnect

      if (!shouldConnect || !accessTokenRef.current) {
        clearReconnectTimer(reconnectTimerRef)
        void websocketAdapter.disconnect()
        useSocketStore.getState().reset()
        return
      }

      void websocketAdapter.connect(resolveWebSocketUrl())
    }

    syncConnection()

    const subscription = AppState.addEventListener("change", nextState => {
      appStateRef.current = nextState
      syncConnection()
    })

    return () => {
      shouldReconnectRef.current = false
      clearReconnectTimer(reconnectTimerRef)
      subscription.remove()
      void websocketAdapter.disconnect()
      useSocketStore.getState().reset()
    }
  }, [isBootstrapped, accessToken])

  return children
}
