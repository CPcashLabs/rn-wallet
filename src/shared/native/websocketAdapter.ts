import { NativeCapabilityUnavailableError } from "@/shared/errors"
import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { unsupportedCapability } from "@/shared/native/types"

export type WebSocketAdapterEvent =
  | { type: "open" }
  | { type: "close"; code?: number; reason?: string }
  | { type: "error"; error: Error }
  | { type: "message"; data: string }

export interface WebSocketAdapter {
  getCapability(): CapabilityDescriptor
  connect(url: string): Promise<AdapterResult<void>>
  send(data: string): Promise<AdapterResult<void>>
  disconnect(code?: number, reason?: string): Promise<AdapterResult<void>>
  subscribe(listener: (event: WebSocketAdapterEvent) => void): () => void
  isConnected(): boolean
}

let activeSocket: WebSocket | null = null
let activeUrl: string | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<(event: WebSocketAdapterEvent) => void>()

function emit(event: WebSocketAdapterEvent) {
  listeners.forEach(listener => {
    listener(event)
  })
}

function stopHeartbeat() {
  if (!heartbeatTimer) {
    return
  }

  clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

function startHeartbeat(socket: WebSocket) {
  stopHeartbeat()

  heartbeatTimer = setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(
      JSON.stringify({
        type: "ping",
      }),
    )
  }, 10_000)
}

function clearSocket(socket: WebSocket) {
  socket.onopen = null
  socket.onclose = null
  socket.onerror = null
  socket.onmessage = null
  stopHeartbeat()
}

export const websocketAdapter: WebSocketAdapter = {
  getCapability() {
    if (typeof WebSocket !== "function") {
      return unsupportedCapability("websocket")
    }

    return {
      supported: true,
    }
  },
  async connect(url) {
    const capability = this.getCapability()
    if (!capability.supported) {
      return {
        ok: false,
        error: new NativeCapabilityUnavailableError("websocket", capability.reason),
      }
    }

    if (activeSocket && activeUrl === url && (activeSocket.readyState === WebSocket.CONNECTING || activeSocket.readyState === WebSocket.OPEN)) {
      return {
        ok: true,
        data: undefined,
      }
    }

    if (activeSocket) {
      clearSocket(activeSocket)

      try {
        activeSocket.close(1000, "replaced")
      } catch {
        // Ignore close failures from stale sockets.
      }

      activeSocket = null
      activeUrl = null
    }

    try {
      const nextSocket = new WebSocket(url)
      activeSocket = nextSocket
      activeUrl = url

      nextSocket.onopen = () => {
        if (activeSocket !== nextSocket) {
          return
        }

        startHeartbeat(nextSocket)
        emit({ type: "open" })
      }

      nextSocket.onmessage = event => {
        if (activeSocket !== nextSocket) {
          return
        }

        emit({
          type: "message",
          data: typeof event.data === "string" ? event.data : String(event.data),
        })
      }

      nextSocket.onerror = () => {
        if (activeSocket !== nextSocket) {
          return
        }

        emit({
          type: "error",
          error: new Error("WebSocket connection failed."),
        })
      }

      nextSocket.onclose = event => {
        if (activeSocket === nextSocket) {
          activeSocket = null
          activeUrl = null
        }

        stopHeartbeat()
        emit({
          type: "close",
          code: event.code,
          reason: event.reason,
        })
      }

      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      activeSocket = null
      activeUrl = null
      stopHeartbeat()

      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Failed to create WebSocket connection."),
      }
    }
  },
  async send(data) {
    if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
      return {
        ok: false,
        error: new Error("WebSocket connection is not open."),
      }
    }

    try {
      activeSocket.send(data)
      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Failed to send WebSocket message."),
      }
    }
  },
  async disconnect(code = 1000, reason = "manual_disconnect") {
    if (!activeSocket) {
      return {
        ok: true,
        data: undefined,
      }
    }

    const socket = activeSocket
    activeSocket = null
    activeUrl = null
    clearSocket(socket)

    try {
      socket.close(code, reason)
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Failed to close WebSocket connection."),
      }
    }

    emit({
      type: "close",
      code,
      reason,
    })

    return {
      ok: true,
      data: undefined,
    }
  },
  subscribe(listener) {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  },
  isConnected() {
    return activeSocket?.readyState === WebSocket.OPEN
  },
}
