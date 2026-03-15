type FakeWebSocketInstance = {
  url: string
  readyState: number
  sent: string[]
  send: jest.Mock
  close: jest.Mock
  onopen: null | (() => void)
  onclose: null | ((event: { code: number; reason: string }) => void)
  onerror: null | (() => void)
  onmessage: null | ((event: { data: unknown }) => void)
}

type FakeWebSocketConstructor = {
  new (url: string): FakeWebSocketInstance
  instances: FakeWebSocketInstance[]
  constructorError: unknown
  CONNECTING: number
  OPEN: number
  CLOSING: number
  CLOSED: number
}

function createFakeWebSocket(): FakeWebSocketConstructor {
  class FakeWebSocketImpl {
    static instances: FakeWebSocketInstance[] = []
    static constructorError: unknown = null
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3

    url: string
    readyState = FakeWebSocketImpl.CONNECTING
    sent: string[] = []
    send = jest.fn((data: string) => {
      this.sent.push(data)
    })
    close = jest.fn((_code?: number, _reason?: string) => {
      this.readyState = FakeWebSocketImpl.CLOSED
    })
    onopen: null | (() => void) = null
    onclose: null | ((event: { code: number; reason: string }) => void) = null
    onerror: null | (() => void) = null
    onmessage: null | ((event: { data: unknown }) => void) = null

    constructor(url: string) {
      if (FakeWebSocketImpl.constructorError) {
        throw FakeWebSocketImpl.constructorError
      }

      this.url = url
      FakeWebSocketImpl.instances.push(this)
    }
  }

  return FakeWebSocketImpl as unknown as FakeWebSocketConstructor
}

function loadWebsocketAdapter() {
  jest.resetModules()
  return require("@/shared/native/websocketAdapter") as typeof import("@/shared/native/websocketAdapter")
}

describe("websocketAdapter", () => {
  const runtimeGlobals = globalThis as typeof globalThis & {
    WebSocket?: FakeWebSocketConstructor
  }
  const originalWebSocket = runtimeGlobals.WebSocket

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    runtimeGlobals.WebSocket = originalWebSocket
  })

  it("fails closed when WebSocket is unavailable", async () => {
    delete runtimeGlobals.WebSocket
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

  it("connects, emits lifecycle events, sends heartbeats and disconnects", async () => {
    const FakeWebSocket = createFakeWebSocket()
    runtimeGlobals.WebSocket = FakeWebSocket
    const { websocketAdapter } = loadWebsocketAdapter()
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

    const socket = FakeWebSocket.instances[0]
    if (!socket) {
      throw new Error("Missing fake socket instance")
    }

    socket.readyState = FakeWebSocket.OPEN
    socket.onopen?.()
    expect(websocketAdapter.isConnected()).toBe(true)

    socket.onmessage?.({ data: "hello" })
    socket.onmessage?.({ data: 123 })
    socket.onerror?.()

    jest.advanceTimersByTime(10_000)
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "ping" }))

    socket.readyState = FakeWebSocket.CLOSED
    socket.onclose?.({ code: 4001, reason: "server_closed" })
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

  it("reuses an active connection for the same url and replaces stale sockets for a new url", async () => {
    const FakeWebSocket = createFakeWebSocket()
    runtimeGlobals.WebSocket = FakeWebSocket
    const { websocketAdapter } = loadWebsocketAdapter()

    await websocketAdapter.connect("wss://wallet.cp.cash/ws")
    const firstSocket = FakeWebSocket.instances[0]
    if (!firstSocket) {
      throw new Error("Missing first socket instance")
    }

    await websocketAdapter.connect("wss://wallet.cp.cash/ws")
    expect(FakeWebSocket.instances).toHaveLength(1)

    firstSocket.close.mockImplementation(() => {
      throw new Error("close failed")
    })
    const savedOpenHandler = firstSocket.onopen
    const savedMessageHandler = firstSocket.onmessage
    const savedErrorHandler = firstSocket.onerror

    await websocketAdapter.connect("wss://wallet-preview.cp.cash/ws")

    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(firstSocket.onopen).toBeNull()
    expect(firstSocket.onmessage).toBeNull()
    expect(firstSocket.onerror).toBeNull()
    expect(firstSocket.onclose).toBeNull()

    savedOpenHandler?.()
    savedMessageHandler?.({ data: "stale" })
    savedErrorHandler?.()
  })

  it("normalizes constructor, send and close failures", async () => {
    const FakeWebSocket = createFakeWebSocket()
    runtimeGlobals.WebSocket = FakeWebSocket
    FakeWebSocket.constructorError = "constructor failed"
    let mod = loadWebsocketAdapter()

    await expect(mod.websocketAdapter.connect("wss://wallet.cp.cash/ws")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Failed to create WebSocket connection.",
      },
    })

    FakeWebSocket.constructorError = null
    mod = loadWebsocketAdapter()
    await mod.websocketAdapter.connect("wss://wallet.cp.cash/ws")
    const socket = FakeWebSocket.instances[0]
    if (!socket) {
      throw new Error("Missing socket instance")
    }

    await expect(mod.websocketAdapter.send("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "WebSocket connection is not open.",
      },
    })

    socket.readyState = FakeWebSocket.OPEN
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

  it("sends application payloads and emits a manual close event on disconnect", async () => {
    const FakeWebSocket = createFakeWebSocket()
    runtimeGlobals.WebSocket = FakeWebSocket
    const { websocketAdapter } = loadWebsocketAdapter()
    const events: string[] = []

    websocketAdapter.subscribe(event => {
      if (event.type === "close") {
        events.push(`${event.type}:${event.code}:${event.reason}`)
      }
    })

    await websocketAdapter.connect("wss://wallet.cp.cash/ws")
    const socket = FakeWebSocket.instances[0]
    if (!socket) {
      throw new Error("Missing socket instance")
    }

    socket.readyState = FakeWebSocket.OPEN
    socket.onopen?.()

    await expect(websocketAdapter.send("payload")).resolves.toEqual({
      ok: true,
      data: undefined,
    })
    expect(socket.send).toHaveBeenCalledWith("payload")

    socket.readyState = FakeWebSocket.CLOSING
    jest.advanceTimersByTime(10_000)
    expect(socket.send).toHaveBeenCalledTimes(1)

    await expect(websocketAdapter.disconnect(4004, "manual-close")).resolves.toEqual({
      ok: true,
      data: undefined,
    })
    expect(socket.close).toHaveBeenCalledWith(4004, "manual-close")
    expect(events).toContain("close:4004:manual-close")
  })
})
