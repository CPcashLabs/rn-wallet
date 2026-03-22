type FakeSocketEventName = "close" | "error" | "message" | "open"

type FakeSocketListener = (event?: { code?: number; data?: unknown; error?: Error; message?: string; reason?: string }) => void

type FakeReconnectingWebSocketInstance = {
  url: string
  readyState: number
  retryCount: number
  sent: string[]
  send: jest.Mock
  close: jest.Mock
  reconnect: jest.Mock
  addEventListener: (type: FakeSocketEventName, listener: FakeSocketListener) => void
  removeEventListener: (type: FakeSocketEventName, listener: FakeSocketListener) => void
  emit: (type: FakeSocketEventName, event?: { code?: number; data?: unknown; error?: Error; message?: string; reason?: string }) => void
}

type FakeReconnectingWebSocketConstructor = {
  new (url: string): FakeReconnectingWebSocketInstance
  instances: FakeReconnectingWebSocketInstance[]
  constructorError: unknown
  CONNECTING: number
  OPEN: number
  CLOSING: number
  CLOSED: number
}

jest.mock("reconnecting-websocket", () => {
  class FakeReconnectingWebSocketImpl {
    static instances: FakeReconnectingWebSocketInstance[] = []
    static constructorError: unknown = null
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3

    url: string
    readyState = FakeReconnectingWebSocketImpl.CONNECTING
    retryCount = 0
    sent: string[] = []
    listeners = {
      close: new Set<FakeSocketListener>(),
      error: new Set<FakeSocketListener>(),
      message: new Set<FakeSocketListener>(),
      open: new Set<FakeSocketListener>(),
    }
    send = jest.fn((data: string) => {
      this.sent.push(data)
    })
    close = jest.fn((_code?: number, _reason?: string) => {
      this.readyState = FakeReconnectingWebSocketImpl.CLOSED
    })
    reconnect = jest.fn(() => {
      this.retryCount += 1
      this.readyState = FakeReconnectingWebSocketImpl.CONNECTING
    })

    constructor(url: string) {
      if (FakeReconnectingWebSocketImpl.constructorError) {
        throw FakeReconnectingWebSocketImpl.constructorError
      }

      this.url = url
      FakeReconnectingWebSocketImpl.instances.push(this as unknown as FakeReconnectingWebSocketInstance)
    }

    addEventListener(type: FakeSocketEventName, listener: FakeSocketListener) {
      this.listeners[type].add(listener)
    }

    removeEventListener(type: FakeSocketEventName, listener: FakeSocketListener) {
      this.listeners[type].delete(listener)
    }

    emit(type: FakeSocketEventName, event: { code?: number; data?: unknown; error?: Error; message?: string; reason?: string } = {}) {
      this.listeners[type].forEach(listener => {
        listener(event)
      })
    }
  }

  return {
    __esModule: true,
    default: FakeReconnectingWebSocketImpl,
  }
})

function loadWebsocketAdapter() {
  jest.resetModules()
  return require("@/shared/native/websocketAdapter") as typeof import("@/shared/native/websocketAdapter")
}

function getFakeReconnectingWebSocket() {
  return require("reconnecting-websocket").default as FakeReconnectingWebSocketConstructor
}

describe("websocketAdapter", () => {
  const runtimeGlobals = globalThis as typeof globalThis & {
    WebSocket?: unknown
  }
  const originalWebSocket = runtimeGlobals.WebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    const FakeReconnectingWebSocket = getFakeReconnectingWebSocket()
    FakeReconnectingWebSocket.instances.length = 0
    FakeReconnectingWebSocket.constructorError = null
    runtimeGlobals.WebSocket = function MockWebSocket() {} as never
  })

  afterEach(() => {
    jest.useRealTimers()
    runtimeGlobals.WebSocket = originalWebSocket
  })

  it("fails closed when WebSocket is unavailable", async () => {
    runtimeGlobals.WebSocket = undefined as never
    const { websocketAdapter } = loadWebsocketAdapter()

    expect(websocketAdapter.getCapability()).toEqual({
      supported: false,
      reason: "websocket is not available in the current app version",
    })
    await expect(websocketAdapter.connect("wss://wallet.cp.cash/ws")).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
      },
    })
  })

  it("connects, emits lifecycle events, keeps heartbeats and disconnects", async () => {
    const { websocketAdapter } = loadWebsocketAdapter()
    const FakeReconnectingWebSocket = getFakeReconnectingWebSocket()
    const events: string[] = []
    const unsubscribe = websocketAdapter.subscribe(event => {
      if (event.type === "message") {
        events.push(`${event.type}:${event.data}`)
        return
      }

      if (event.type === "close") {
        events.push(`${event.type}:${event.code}:${event.reason}`)
        return
      }

      events.push(event.type)
    })

    await expect(websocketAdapter.connect("wss://wallet.cp.cash/ws")).resolves.toEqual({
      ok: true,
      data: undefined,
    })

    const socket = FakeReconnectingWebSocket.instances[0]
    if (!socket) {
      throw new Error("Missing fake socket instance")
    }

    socket.readyState = FakeReconnectingWebSocket.OPEN
    socket.emit("open")
    expect(websocketAdapter.isConnected()).toBe(true)

    socket.emit("message", { data: "hello" })
    socket.emit("message", { data: 123 })
    socket.emit("error", { error: new Error("boom") })

    jest.advanceTimersByTime(10_000)
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "ping" }))

    socket.readyState = FakeReconnectingWebSocket.CLOSED
    socket.emit("close", { code: 4001, reason: "server_closed" })
    expect(websocketAdapter.isConnected()).toBe(false)

    unsubscribe()
    expect(events).toEqual([
      "open",
      "message:hello",
      "message:123",
      "error",
      "close:4001:server_closed",
    ])

    await expect(websocketAdapter.disconnect()).resolves.toEqual({
      ok: true,
      data: undefined,
    })
  })

  it("reuses the same url, reconnects closed sockets and replaces stale ones for new urls", async () => {
    const { websocketAdapter } = loadWebsocketAdapter()
    const FakeReconnectingWebSocket = getFakeReconnectingWebSocket()

    await websocketAdapter.connect("wss://wallet.cp.cash/ws")
    const firstSocket = FakeReconnectingWebSocket.instances[0]
    if (!firstSocket) {
      throw new Error("Missing first socket instance")
    }

    firstSocket.readyState = FakeReconnectingWebSocket.OPEN
    await websocketAdapter.connect("wss://wallet.cp.cash/ws")
    expect(FakeReconnectingWebSocket.instances).toHaveLength(1)
    expect(firstSocket.reconnect).not.toHaveBeenCalled()

    firstSocket.readyState = FakeReconnectingWebSocket.CLOSED
    await websocketAdapter.connect("wss://wallet.cp.cash/ws")
    expect(firstSocket.reconnect).toHaveBeenCalledTimes(1)

    await websocketAdapter.connect("wss://wallet-preview.cp.cash/ws")
    expect(FakeReconnectingWebSocket.instances).toHaveLength(2)
    expect(firstSocket.close).toHaveBeenCalledWith(1000, "replaced")
  })

  it("normalizes constructor, send and close failures", async () => {
    let mod = loadWebsocketAdapter()
    const FakeReconnectingWebSocket = getFakeReconnectingWebSocket()
    FakeReconnectingWebSocket.constructorError = "constructor failed"

    await expect(mod.websocketAdapter.connect("wss://wallet.cp.cash/ws")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Failed to create WebSocket connection.",
      },
    })

    FakeReconnectingWebSocket.constructorError = null
    mod = loadWebsocketAdapter()
    const ReloadedFakeReconnectingWebSocket = getFakeReconnectingWebSocket()
    await mod.websocketAdapter.connect("wss://wallet.cp.cash/ws")
    const socket = ReloadedFakeReconnectingWebSocket.instances[0]
    if (!socket) {
      throw new Error("Missing socket instance")
    }

    await expect(mod.websocketAdapter.send("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "WebSocket connection is not open.",
      },
    })

    socket.readyState = ReloadedFakeReconnectingWebSocket.OPEN
    socket.send.mockImplementation(() => {
      throw "send failed"
    })

    await expect(mod.websocketAdapter.send("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Failed to send WebSocket message.",
      },
    })

    socket.close.mockImplementation(() => {
      throw "close failed"
    })

    await expect(mod.websocketAdapter.disconnect(4999, "manual")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Failed to close WebSocket connection.",
      },
    })
  })

  it("preserves Error instances for constructor, send and close failures", async () => {
    let mod = loadWebsocketAdapter()
    const FakeReconnectingWebSocket = getFakeReconnectingWebSocket()
    FakeReconnectingWebSocket.constructorError = new Error("constructor failed")

    await expect(mod.websocketAdapter.connect("wss://wallet.cp.cash/ws")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "constructor failed",
      },
    })

    FakeReconnectingWebSocket.constructorError = null
    mod = loadWebsocketAdapter()
    const ReloadedFakeReconnectingWebSocket = getFakeReconnectingWebSocket()
    await mod.websocketAdapter.connect("wss://wallet.cp.cash/ws")
    const socket = ReloadedFakeReconnectingWebSocket.instances[0]
    if (!socket) {
      throw new Error("Missing socket instance")
    }

    socket.readyState = ReloadedFakeReconnectingWebSocket.OPEN
    socket.send.mockImplementation(() => {
      throw new Error("send failed")
    })

    await expect(mod.websocketAdapter.send("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "send failed",
      },
    })

    socket.close.mockImplementation(() => {
      throw new Error("close failed")
    })

    await expect(mod.websocketAdapter.disconnect(4999, "manual")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "close failed",
      },
    })
  })

  it("tracks retry counts exposed by the reconnecting client", async () => {
    const { websocketAdapter } = loadWebsocketAdapter()
    const FakeReconnectingWebSocket = getFakeReconnectingWebSocket()

    await websocketAdapter.connect("wss://wallet.cp.cash/ws")
    const socket = FakeReconnectingWebSocket.instances[0]
    if (!socket) {
      throw new Error("Missing socket instance")
    }

    expect(websocketAdapter.getRetryCount()).toBe(0)
    socket.retryCount = 2
    expect(websocketAdapter.getRetryCount()).toBe(2)
  })
})
