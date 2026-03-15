import { buildWebSocketAuthMessage } from "@/shared/config/runtime"
import type { WebSocketAdapter } from "@/shared/native/websocketAdapter"

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
