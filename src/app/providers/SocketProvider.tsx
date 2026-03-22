import React, { type PropsWithChildren, useCallback, useEffect, useRef } from "react"

import { AppState, type AppStateStatus } from "react-native"

import { resolveWebSocketUrl } from "@/shared/config/runtime"
import { logWarnSafely } from "@/shared/logging/safeConsole"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { websocketAdapter } from "@/shared/native/websocketAdapter"
import {
  authenticateSocketConnection,
  isInternalSocketEvent,
  isSocketAuthAckEvent,
} from "@/app/providers/socketAuth"
import { resolveSocketInvalidationDomain } from "@/app/providers/socketInvalidation"
import {
  DEFAULT_SOCKET_RECONNECT_DELAY_MS,
  invalidateReconnectAttempt,
  resolveReconnectDelayMs,
  scheduleReconnectAttempt,
  shouldReconnectAfterClose,
} from "@/app/providers/socketReconnect"

const SOCKET_LIFECYCLE_LOG_TAG = "[socket.lifecycle]"
const SOCKET_LIFECYCLE_COMPONENT = "socket.lifecycle"
const SOCKET_LIFECYCLE_LOG_TYPES = {
  socketError: "socket_error",
  closeReconnecting: "close_reconnecting",
  closeStopped: "close_stopped",
} as const

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
  const reconnectAttemptRef = useRef(0)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const accessTokenRef = useRef<string | null>(accessToken)
  const shouldReconnectRef = useRef(false)

  const invalidateReconnect = useCallback(() => {
    invalidateReconnectAttempt(reconnectTimerRef, reconnectGenerationRef)
  }, [])

  const resetReconnectAttempts = useCallback(() => {
    reconnectAttemptRef.current = 0
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
    const attempt = reconnectAttemptRef.current + 1
    const delayMs = resolveReconnectDelayMs(attempt, DEFAULT_SOCKET_RECONNECT_DELAY_MS)

    const scheduled = scheduleReconnectAttempt({
      delayMs,
      timerRef: reconnectTimerRef,
      generationRef: reconnectGenerationRef,
      canReconnect: () =>
        Boolean(
          shouldReconnectRef.current &&
          accessTokenRef.current &&
          isForeground(appStateRef.current),
        ),
      onReconnect: () => {
        void websocketAdapter.connect(resolveWebSocketUrl())
      },
    })

    if (!scheduled) {
      return null
    }

    reconnectAttemptRef.current = attempt

    return delayMs
  }, [])

  const syncConnection = useCallback(() => {
    const shouldConnect = isBootstrapped && Boolean(accessTokenRef.current) && isForeground(appStateRef.current)
    shouldReconnectRef.current = shouldConnect
    invalidateReconnect()

    if (!shouldConnect || !accessTokenRef.current) {
      resetReconnectAttempts()
      void websocketAdapter.disconnect()
      useSocketStore.getState().reset()
      return
    }

    void websocketAdapter.connect(resolveWebSocketUrl())
  }, [invalidateReconnect, isBootstrapped, resetReconnectAttempts])

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
          if (isSocketAuthAckEvent(parsed.type)) {
            resetReconnectAttempts()
          }

          if (isInternalSocketEvent(parsed.type)) {
            return
          }

          const domain = resolveSocketInvalidationDomain(parsed.type)
          if (domain === "messages") {
            socketStore.bumpMessageRevision()
            return
          }

          if (domain === "copouch") {
            socketStore.bumpCopouchRevision()
          }
          return
        }
        case "error":
          logWarnSafely(SOCKET_LIFECYCLE_LOG_TAG, {
            context: {
              component: SOCKET_LIFECYCLE_COMPONENT,
              event: SOCKET_LIFECYCLE_LOG_TYPES.socketError,
              message: "WebSocket emitted an error event.",
              details: {
                error: event.error.message,
                attempt: reconnectAttemptRef.current,
              },
            },
            forwardToConsole: false,
          })
          socketStore.setConnected(false)
          return
        case "close": {
          socketStore.setConnected(false)
          const shouldReconnect = Boolean(
            shouldReconnectRef.current &&
            accessTokenRef.current &&
            isForeground(appStateRef.current),
          )
          const nextAttempt = reconnectAttemptRef.current + 1
          const canReconnectAfterClose = shouldReconnectAfterClose({
            attempt: nextAttempt,
            reason: event.reason,
            shouldReconnect,
          })

          if (!shouldReconnect) {
            return
          }

          if (!canReconnectAfterClose) {
            reconnectAttemptRef.current = nextAttempt

            logWarnSafely(SOCKET_LIFECYCLE_LOG_TAG, {
              context: {
                component: SOCKET_LIFECYCLE_COMPONENT,
                event: SOCKET_LIFECYCLE_LOG_TYPES.closeStopped,
                message: "WebSocket closed repeatedly and reconnecting was stopped.",
                details: {
                  code: event.code ?? null,
                  reason: event.reason ?? "unknown",
                  attempt: reconnectAttemptRef.current,
                  appState: appStateRef.current,
                  hasAccessToken: Boolean(accessTokenRef.current),
                },
              },
              forwardToConsole: false,
            })
            return
          }

          const delayMs = scheduleReconnect()
          if (delayMs == null) {
            return
          }

          logWarnSafely(SOCKET_LIFECYCLE_LOG_TAG, {
            context: {
              component: SOCKET_LIFECYCLE_COMPONENT,
              event: SOCKET_LIFECYCLE_LOG_TYPES.closeReconnecting,
              message: "WebSocket closed unexpectedly and a reconnect was scheduled.",
              details: {
                code: event.code ?? null,
                reason: event.reason ?? "unknown",
                attempt: reconnectAttemptRef.current,
                delayMs,
                appState: appStateRef.current,
                hasAccessToken: Boolean(accessTokenRef.current),
              },
            },
            forwardToConsole: false,
          })
          return
        }
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
      resetReconnectAttempts()
      invalidateReconnect()
      subscription.remove()
      void websocketAdapter.disconnect()
      useSocketStore.getState().reset()
    }
  }, [invalidateReconnect, resetReconnectAttempts, syncConnection])

  useEffect(() => {
    accessTokenRef.current = accessToken
    syncConnection()
  }, [accessToken, syncConnection])

  return children
}
