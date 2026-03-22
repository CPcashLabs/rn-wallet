import { buildWebSocketAuthMessage } from "@/shared/config/runtime"
import { logWarnSafely } from "@/shared/logging/safeConsole"
import type { WebSocketAdapter } from "@/shared/native/websocketAdapter"

const SOCKET_AUTH_LOG_TAG = "[socket.auth]"
const SOCKET_AUTH_COMPONENT = "socket.auth"
const SOCKET_AUTH_LOG_TYPES = {
  authenticateFailed: "authenticate_failed",
} as const

export async function authenticateSocketConnection(
  adapter: Pick<WebSocketAdapter, "send" | "disconnect">,
  accessToken?: string | null,
) {
  if (!accessToken) {
    return true
  }

  const result = await adapter.send(buildWebSocketAuthMessage(accessToken))
  if (result.ok) {
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

export function isSocketAuthAckEvent(type?: string) {
  if (!type) {
    return false
  }

  const normalized = type.trim().toLowerCase()
  return normalized === "authenticated" || normalized === "auth_success" || normalized === "auth-ok"
}

export function isInternalSocketEvent(type?: string) {
  if (!type) {
    return false
  }

  const normalized = type.trim().toLowerCase()
  return normalized === "pong" || isSocketAuthAckEvent(normalized)
}
