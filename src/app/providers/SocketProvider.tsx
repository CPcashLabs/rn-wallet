import React, { type PropsWithChildren, useCallback, useEffect, useRef } from "react"

import { AppState, type AppStateStatus } from "react-native"

import { resolveAuthenticatedWebSocketUrl, resolveWebSocketUrl } from "@/shared/config/runtime"
import { logRuntimeInfo, logRuntimeWarn } from "@/shared/logging/appLogger"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { websocketAdapter } from "@/shared/native/websocketAdapter"
import {
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
  connectStarted: "connect_started",
  connectOpened: "connect_opened",
  connectFailed: "connect_failed",
  authAckReceived: "auth_ack_received",
  socketError: "socket_error",
  closeReconnecting: "close_reconnecting",
  closeStopped: "close_stopped",
  disconnectFailed: "disconnect_failed",
} as const
const SOCKET_AUTH_MODE_QUERY_TOKEN = "query_token"
const SOCKET_CONNECT_TRIGGERS = {
  sync: "sync",
  reconnect: "reconnect",
} as const

type SocketConnectTrigger = (typeof SOCKET_CONNECT_TRIGGERS)[keyof typeof SOCKET_CONNECT_TRIGGERS]

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
  const connectSequenceRef = useRef(0)
  const connectStartedAtRef = useRef<number | null>(null)
  const openedAtRef = useRef<number | null>(null)
  const lastConnectTriggerRef = useRef<SocketConnectTrigger>(SOCKET_CONNECT_TRIGGERS.sync)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const accessTokenRef = useRef<string | null>(accessToken)
  const pendingSocketTokenRef = useRef<string | null>(null)
  const connectedSocketTokenRef = useRef<string | null>(null)
  const shouldReconnectRef = useRef(false)

  const buildSocketLogDetails = useCallback((details?: Record<string, unknown>) => {
    const baseDetails: Record<string, unknown> = {
      connectionId: connectSequenceRef.current,
      appState: appStateRef.current,
      hasAccessToken: Boolean(accessTokenRef.current),
      authMode: SOCKET_AUTH_MODE_QUERY_TOKEN,
      socketUrl: resolveWebSocketUrl(),
    }

    if (!details) {
      return baseDetails
    }

    return {
      ...baseDetails,
      ...details,
    }
  }, [])

  const invalidateReconnect = useCallback(() => {
    invalidateReconnectAttempt(reconnectTimerRef, reconnectGenerationRef)
  }, [])

  const resetReconnectAttempts = useCallback(() => {
    reconnectAttemptRef.current = 0
  }, [])

  const disconnectSocket = useCallback(
    async (reason: string) => {
      pendingSocketTokenRef.current = null
      connectedSocketTokenRef.current = null
      connectStartedAtRef.current = null
      openedAtRef.current = null

      const result = await websocketAdapter.disconnect(1000, reason)
      if (result.ok) {
        return
      }

      logRuntimeWarn({
        tag: SOCKET_LIFECYCLE_LOG_TAG,
        component: SOCKET_LIFECYCLE_COMPONENT,
        event: SOCKET_LIFECYCLE_LOG_TYPES.disconnectFailed,
        message: "WebSocket disconnect request failed.",
        details: buildSocketLogDetails({
          reason,
          error: result.error.message,
        }),
      })
    },
    [buildSocketLogDetails],
  )

  const connectSocket = useCallback(
    async (trigger: SocketConnectTrigger) => {
      const currentAccessToken = accessTokenRef.current
      if (!currentAccessToken) {
        return
      }

      if (pendingSocketTokenRef.current === currentAccessToken) {
        return
      }

      if (websocketAdapter.isConnected() && connectedSocketTokenRef.current === currentAccessToken) {
        return
      }

      connectSequenceRef.current += 1
      connectStartedAtRef.current = Date.now()
      openedAtRef.current = null
      lastConnectTriggerRef.current = trigger
      connectedSocketTokenRef.current = null
      pendingSocketTokenRef.current = currentAccessToken

      logRuntimeInfo({
        tag: SOCKET_LIFECYCLE_LOG_TAG,
        component: SOCKET_LIFECYCLE_COMPONENT,
        event: SOCKET_LIFECYCLE_LOG_TYPES.connectStarted,
        message: "Started a WebSocket connection attempt.",
        details: buildSocketLogDetails({
          trigger,
          reconnectAttempt: reconnectAttemptRef.current,
        }),
      })

      const result = await websocketAdapter.connect(resolveAuthenticatedWebSocketUrl(currentAccessToken))
      if (result.ok) {
        return
      }

      pendingSocketTokenRef.current = null
      connectStartedAtRef.current = null
      useSocketStore.getState().setConnected(false)

      logRuntimeWarn({
        tag: SOCKET_LIFECYCLE_LOG_TAG,
        component: SOCKET_LIFECYCLE_COMPONENT,
        event: SOCKET_LIFECYCLE_LOG_TYPES.connectFailed,
        message: "WebSocket connection attempt failed before the socket opened.",
        details: buildSocketLogDetails({
          trigger,
          reconnectAttempt: reconnectAttemptRef.current,
          error: result.error.message,
        }),
      })
    },
    [buildSocketLogDetails],
  )

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
        const currentAccessToken = accessTokenRef.current
        if (!currentAccessToken) {
          return
        }

        void connectSocket(SOCKET_CONNECT_TRIGGERS.reconnect)
      },
    })

    if (!scheduled) {
      return null
    }

    reconnectAttemptRef.current = attempt

    return delayMs
  }, [connectSocket])

  const syncConnection = useCallback(() => {
    const shouldConnect = isBootstrapped && Boolean(accessTokenRef.current) && isForeground(appStateRef.current)
    shouldReconnectRef.current = shouldConnect
    invalidateReconnect()

    if (!shouldConnect || !accessTokenRef.current) {
      resetReconnectAttempts()
      void disconnectSocket("sync_inactive")
      useSocketStore.getState().reset()
      return
    }

    void connectSocket(SOCKET_CONNECT_TRIGGERS.sync)
  }, [connectSocket, disconnectSocket, invalidateReconnect, isBootstrapped, resetReconnectAttempts])

  useEffect(() => {
    const unsubscribe = websocketAdapter.subscribe(event => {
      const socketStore = useSocketStore.getState()

      switch (event.type) {
        case "open":
          pendingSocketTokenRef.current = null
          connectedSocketTokenRef.current = accessTokenRef.current
          openedAtRef.current = Date.now()
          invalidateReconnect()
          resetReconnectAttempts()
          socketStore.setConnected(true)
          logRuntimeInfo({
            tag: SOCKET_LIFECYCLE_LOG_TAG,
            component: SOCKET_LIFECYCLE_COMPONENT,
            event: SOCKET_LIFECYCLE_LOG_TYPES.connectOpened,
            message: "WebSocket opened and is ready to receive messages.",
            details: buildSocketLogDetails({
              trigger: lastConnectTriggerRef.current,
              reconnectAttempt: reconnectAttemptRef.current,
              handshakeDurationMs:
                connectStartedAtRef.current == null ? undefined : openedAtRef.current - connectStartedAtRef.current,
            }),
          })
          return
        case "message": {
          const parsed = parseSocketPayload(event.data)
          if (isSocketAuthAckEvent(parsed.type)) {
            resetReconnectAttempts()
            logRuntimeInfo({
              tag: SOCKET_LIFECYCLE_LOG_TAG,
              component: SOCKET_LIFECYCLE_COMPONENT,
              event: SOCKET_LIFECYCLE_LOG_TYPES.authAckReceived,
              message: "WebSocket authentication was acknowledged by the server.",
              details: buildSocketLogDetails({
                ackType: parsed.type,
                connectionAgeMs: openedAtRef.current == null ? undefined : Date.now() - openedAtRef.current,
              }),
            })
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
          logRuntimeWarn({
            tag: SOCKET_LIFECYCLE_LOG_TAG,
            component: SOCKET_LIFECYCLE_COMPONENT,
            event: SOCKET_LIFECYCLE_LOG_TYPES.socketError,
            message: "WebSocket emitted an error event.",
            details: buildSocketLogDetails({
              error: event.error.message,
              attempt: reconnectAttemptRef.current,
            }),
          })
          socketStore.setConnected(false)
          return
        case "close": {
          socketStore.setConnected(false)
          pendingSocketTokenRef.current = null
          connectedSocketTokenRef.current = null
          const connectionLifetimeMs = openedAtRef.current == null ? undefined : Date.now() - openedAtRef.current
          openedAtRef.current = null
          connectStartedAtRef.current = null
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

            logRuntimeWarn({
              tag: SOCKET_LIFECYCLE_LOG_TAG,
              component: SOCKET_LIFECYCLE_COMPONENT,
              event: SOCKET_LIFECYCLE_LOG_TYPES.closeStopped,
              message: "WebSocket closed repeatedly and reconnecting was stopped.",
              details: buildSocketLogDetails({
                code: event.code ?? null,
                reason: event.reason ?? "unknown",
                attempt: reconnectAttemptRef.current,
                connectionLifetimeMs,
              }),
            })
            return
          }

          const delayMs = scheduleReconnect()
          if (delayMs == null) {
            return
          }

          logRuntimeWarn({
            tag: SOCKET_LIFECYCLE_LOG_TAG,
            component: SOCKET_LIFECYCLE_COMPONENT,
            event: SOCKET_LIFECYCLE_LOG_TYPES.closeReconnecting,
            message: "WebSocket closed unexpectedly and a reconnect was scheduled.",
            details: buildSocketLogDetails({
              code: event.code ?? null,
              reason: event.reason ?? "unknown",
              attempt: reconnectAttemptRef.current,
              delayMs,
              connectionLifetimeMs,
            }),
          })
          return
        }
      }
    })

    return () => {
      invalidateReconnect()
      unsubscribe()
    }
  }, [buildSocketLogDetails, invalidateReconnect, resetReconnectAttempts, scheduleReconnect])

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
      void disconnectSocket("provider_cleanup")
      useSocketStore.getState().reset()
    }
  }, [disconnectSocket, invalidateReconnect, resetReconnectAttempts, syncConnection])

  useEffect(() => {
    accessTokenRef.current = accessToken
    syncConnection()
  }, [accessToken, syncConnection])

  return children
}
