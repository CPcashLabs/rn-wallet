import { buildWebSocketAuthMessage } from "@/shared/config/runtime"
import { logInfoSafely, logWarnSafely } from "@/shared/logging/safeConsole"
import type { WebSocketAdapter } from "@/shared/native/websocketAdapter"

const SOCKET_AUTH_LOG_TAG = "[socket.auth]"
const SOCKET_AUTH_COMPONENT = "socket.auth"
const SOCKET_AUTH_LOG_TYPES = {
  skipAuthentication: "skip_authentication",
  authenticateSucceeded: "authenticate_succeeded",
  authenticateFailed: "authenticate_failed",
} as const

export async function authenticateSocketConnection(
  adapter: Pick<WebSocketAdapter, "send" | "disconnect">,
  accessToken?: string | null,
) {
  if (!accessToken) {
    logInfoSafely(SOCKET_AUTH_LOG_TAG, {
      context: {
        component: SOCKET_AUTH_COMPONENT,
        event: SOCKET_AUTH_LOG_TYPES.skipAuthentication,
        message: "Skipped socket authentication because no access token is available.",
        details: {
          hasAccessToken: false,
        },
      },
      forwardToConsole: false,
    })
    return true
  }

  const result = await adapter.send(buildWebSocketAuthMessage(accessToken))
  if (result.ok) {
    logInfoSafely(SOCKET_AUTH_LOG_TAG, {
      context: {
        component: SOCKET_AUTH_COMPONENT,
        event: SOCKET_AUTH_LOG_TYPES.authenticateSucceeded,
        message: "Authenticated the socket connection successfully.",
        details: {
          hasAccessToken: true,
        },
      },
      forwardToConsole: false,
    })
    return true
  }

  logWarnSafely(SOCKET_AUTH_LOG_TAG, {
    context: {
      component: SOCKET_AUTH_COMPONENT,
      event: SOCKET_AUTH_LOG_TYPES.authenticateFailed,
      message: "Failed to send the socket authentication payload and disconnected the socket.",
      details: {
        hasAccessToken: true,
        reason: result.error.message,
      },
    },
    forwardToConsole: false,
  })
  await adapter.disconnect(4001, "auth_send_failed")
  return false
}

export function isInternalSocketEvent(type?: string) {
  if (!type) {
    return false
  }

  const normalized = type.trim().toLowerCase()
  return normalized === "pong" || normalized === "authenticated" || normalized === "auth_success" || normalized === "auth-ok"
}
