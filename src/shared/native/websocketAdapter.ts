import ReconnectingWebSocket from "reconnecting-websocket"

export type WebSocketAdapterEvent =
  | { type: "open" }
  | { type: "close"; code?: number; reason?: string }
  | { type: "error"; error: Error }
  | { type: "message"; data: string }

export interface WebSocketAdapter {
  connect(url: string): Promise<void>
  disconnect(code?: number, reason?: string): Promise<void>
  subscribe(listener: (event: WebSocketAdapterEvent) => void): () => void
  isConnected(): boolean
  getRetryCount(): number
}

const HEARTBEAT_INTERVAL_MS = 10_000
const RECONNECTING_SOCKET_OPTIONS = {
  connectionTimeout: 4_000,
  maxRetries: Infinity,
  maxReconnectionDelay: 30_000,
  minReconnectionDelay: 1_500,
  minUptime: 5_000,
  reconnectionDelayGrowFactor: 2,
} as const

let activeSocket: ReconnectingWebSocket | null = null
let activeUrl: string | null = null
let activeCleanup: (() => void) | null = null
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

function startHeartbeat(socket: ReconnectingWebSocket) {
  stopHeartbeat()

  heartbeatTimer = setInterval(() => {
    if (socket.readyState !== ReconnectingWebSocket.OPEN) {
      return
    }

    try {
      socket.send(
        JSON.stringify({
          type: "ping",
        }),
      )
    } catch {
      // Ignore heartbeat failures; reconnecting-websocket will manage transport retries.
    }
  }, HEARTBEAT_INTERVAL_MS)
}

function detachActiveSocket() {
  activeCleanup?.()
  activeCleanup = null
  stopHeartbeat()
}

function attachSocket(nextSocket: ReconnectingWebSocket) {
  const handleOpen = () => {
    if (activeSocket !== nextSocket) {
      return
    }

    startHeartbeat(nextSocket)
    emit({ type: "open" })
  }

  const handleMessage = (event: MessageEvent) => {
    if (activeSocket !== nextSocket) {
      return
    }

    emit({
      type: "message",
      data: typeof event.data === "string" ? event.data : String(event.data),
    })
  }

  const handleError = (event: { message?: string; error?: unknown }) => {
    if (activeSocket !== nextSocket) {
      return
    }

    emit({
      type: "error",
      error:
        event.error instanceof Error
          ? event.error
          : new Error(event.message || "WebSocket connection failed."),
    })
  }

  const handleClose = (event: { code?: number; reason?: string }) => {
    if (activeSocket !== nextSocket) {
      return
    }

    stopHeartbeat()
    emit({
      type: "close",
      code: event.code,
      reason: event.reason,
    })
  }

  nextSocket.addEventListener("open", handleOpen)
  nextSocket.addEventListener("message", handleMessage)
  nextSocket.addEventListener("error", handleError)
  nextSocket.addEventListener("close", handleClose)

  activeCleanup = () => {
    nextSocket.removeEventListener("open", handleOpen)
    nextSocket.removeEventListener("message", handleMessage)
    nextSocket.removeEventListener("error", handleError)
    nextSocket.removeEventListener("close", handleClose)
  }
}

function replaceSocket(nextSocket: ReconnectingWebSocket, url: string) {
  const previousSocket = activeSocket

  activeSocket = nextSocket
  activeUrl = url
  detachActiveSocket()
  attachSocket(nextSocket)

  if (!previousSocket) {
    return
  }

  try {
    previousSocket.close(1000, "replaced")
  } catch {
    // Ignore close failures from stale sockets.
  }
}

function createAdapterError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage)
}

export const websocketAdapter: WebSocketAdapter = {
  async connect(url) {
    if (typeof WebSocket !== "function") {
      throw new Error("WebSocket is not available in the current app version.")
    }

    if (activeSocket && activeUrl === url) {
      if (activeSocket.readyState === ReconnectingWebSocket.CLOSED) {
        activeSocket.reconnect()
      }

      return
    }

    try {
      const nextSocket = new ReconnectingWebSocket(url, [], {
        ...RECONNECTING_SOCKET_OPTIONS,
        WebSocket,
      })
      replaceSocket(nextSocket, url)
    } catch (error) {
      activeSocket = null
      activeUrl = null
      detachActiveSocket()
      throw createAdapterError(error, "Failed to create WebSocket connection.")
    }
  },
  async disconnect(code = 1000, reason = "manual_disconnect") {
    if (!activeSocket) {
      return
    }

    const socket = activeSocket
    activeSocket = null
    activeUrl = null
    detachActiveSocket()

    try {
      socket.close(code, reason)
    } catch (error) {
      throw createAdapterError(error, "Failed to close WebSocket connection.")
    }

    emit({
      type: "close",
      code,
      reason,
    })
  },
  subscribe(listener) {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  },
  isConnected() {
    return activeSocket?.readyState === ReconnectingWebSocket.OPEN
  },
  getRetryCount() {
    return activeSocket?.retryCount ?? 0
  },
}
