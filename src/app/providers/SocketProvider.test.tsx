import React from "react"

import { act, create, type ReactTestRenderer } from "react-test-renderer"

import { SocketProvider } from "@/app/providers/SocketProvider"
import type { WebSocketAdapterEvent } from "@/shared/native/websocketAdapter"

const mockLogRuntimeInfo = jest.fn()
const mockLogRuntimeWarn = jest.fn()
const mockConnect = jest.fn()
const mockDisconnect = jest.fn()
const mockSubscribe = jest.fn()
const mockIsConnected = jest.fn()
const mockGetRetryCount = jest.fn()
const mockSetConnected = jest.fn()
const mockBumpMessageRevision = jest.fn()
const mockBumpCopouchRevision = jest.fn()
const mockResetSocketStore = jest.fn()
const mockAppStateRemove = jest.fn()

let socketListener: ((event: WebSocketAdapterEvent) => void) | null = null

const authState = {
  isBootstrapped: true,
  session: {
    accessToken: "secret-token",
  },
}

jest.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (_event: string, _handler: (nextState: string) => void) => {
      return {
        remove: mockAppStateRemove,
      }
    },
  },
}))

jest.mock("@/shared/config/runtime", () => ({
  resolveWebSocketUrl: () => "wss://wallet.cp.cash/ws",
  resolveAuthenticatedWebSocketUrl: (accessToken: string) => `wss://wallet.cp.cash/ws?access_token=${accessToken}`,
}))

jest.mock("@/shared/logging/appLogger", () => ({
  logRuntimeInfo: (...args: unknown[]) => mockLogRuntimeInfo(...args),
  logRuntimeWarn: (...args: unknown[]) => mockLogRuntimeWarn(...args),
}))

jest.mock("@/shared/native/websocketAdapter", () => ({
  websocketAdapter: {
    connect: (...args: unknown[]) => mockConnect(...args),
    disconnect: (...args: unknown[]) => mockDisconnect(...args),
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    isConnected: (...args: unknown[]) => mockIsConnected(...args),
    getRetryCount: (...args: unknown[]) => mockGetRetryCount(...args),
  },
}))

jest.mock("@/shared/store/useAuthStore", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}))

jest.mock("@/shared/store/useSocketStore", () => ({
  useSocketStore: {
    getState: () => ({
      setConnected: mockSetConnected,
      bumpMessageRevision: mockBumpMessageRevision,
      bumpCopouchRevision: mockBumpCopouchRevision,
      reset: mockResetSocketStore,
    }),
  },
}))

jest.mock("@/app/providers/socketInvalidation", () => ({
  resolveSocketInvalidationDomain: () => null,
}))

function emitSocketEvent(event: WebSocketAdapterEvent) {
  if (!socketListener) {
    throw new Error("socket listener is missing")
  }

  socketListener(event)
}

describe("SocketProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-03-22T10:30:00.000Z"))

    socketListener = null
    authState.isBootstrapped = true
    authState.session = {
      accessToken: "secret-token",
    }

    mockLogRuntimeInfo.mockReset()
    mockLogRuntimeWarn.mockReset()
    mockConnect.mockReset()
    mockDisconnect.mockReset()
    mockSubscribe.mockReset()
    mockIsConnected.mockReset()
    mockSetConnected.mockReset()
    mockGetRetryCount.mockReset()
    mockBumpMessageRevision.mockReset()
    mockBumpCopouchRevision.mockReset()
    mockResetSocketStore.mockReset()
    mockAppStateRemove.mockReset()

    mockConnect.mockResolvedValue({
      ok: true,
      data: undefined,
    })
    mockDisconnect.mockResolvedValue({
      ok: true,
      data: undefined,
    })
    mockIsConnected.mockReturnValue(false)
    mockGetRetryCount.mockReturnValue(0)
    mockSubscribe.mockImplementation((listener: (event: WebSocketAdapterEvent) => void) => {
      socketListener = listener
      return jest.fn()
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("logs socket connect, open, auth ack and reconnect diagnostics with timing details", async () => {
    let renderer!: ReactTestRenderer

    await act(async () => {
      renderer = create(
        <SocketProvider>
          <></>
        </SocketProvider>,
      )
      await Promise.resolve()
    })

    expect(mockConnect).toHaveBeenCalledWith("wss://wallet.cp.cash/ws?access_token=secret-token")
    expect(mockLogRuntimeInfo).toHaveBeenNthCalledWith(1, {
      tag: "[socket.lifecycle]",
      component: "socket.lifecycle",
      event: "connect_started",
      message: "Started a WebSocket connection attempt.",
      details: expect.objectContaining({
        connectionId: 1,
        trigger: "sync",
        retryCount: 0,
        appState: "active",
        hasAccessToken: true,
        authMode: "query_token",
        socketUrl: "wss://wallet.cp.cash/ws",
      }),
    })

    await act(async () => {
      jest.setSystemTime(new Date("2026-03-22T10:30:00.300Z"))
      emitSocketEvent({ type: "open" })
      await Promise.resolve()
    })

    expect(mockSetConnected).toHaveBeenCalledWith(true)
    expect(mockLogRuntimeInfo).toHaveBeenNthCalledWith(2, {
      tag: "[socket.lifecycle]",
      component: "socket.lifecycle",
      event: "connect_opened",
      message: "WebSocket opened and is ready to receive messages.",
      details: expect.objectContaining({
        connectionId: 1,
        trigger: "sync",
        retryCount: 0,
        handshakeDurationMs: 300,
        socketUrl: "wss://wallet.cp.cash/ws",
      }),
    })

    await act(async () => {
      jest.setSystemTime(new Date("2026-03-22T10:30:00.800Z"))
      emitSocketEvent({
        type: "message",
        data: JSON.stringify({
          type: "authenticated",
        }),
      })
      await Promise.resolve()
    })

    expect(mockLogRuntimeInfo).toHaveBeenNthCalledWith(3, {
      tag: "[socket.lifecycle]",
      component: "socket.lifecycle",
      event: "auth_ack_received",
      message: "WebSocket authentication was acknowledged by the server.",
      details: expect.objectContaining({
        connectionId: 1,
        ackType: "authenticated",
        connectionAgeMs: 500,
        retryCount: 0,
        socketUrl: "wss://wallet.cp.cash/ws",
      }),
    })

    await act(async () => {
      jest.setSystemTime(new Date("2026-03-22T10:30:04.600Z"))
      emitSocketEvent({
        type: "close",
        code: 1001,
        reason: "Stream end encountered",
      })
      await Promise.resolve()
    })

    expect(mockSetConnected).toHaveBeenLastCalledWith(false)
    expect(mockLogRuntimeWarn).toHaveBeenCalledWith({
      tag: "[socket.lifecycle]",
      component: "socket.lifecycle",
      event: "close_reconnecting",
      message: "WebSocket closed unexpectedly and the reconnecting client stayed active.",
      details: expect.objectContaining({
        connectionId: 2,
        code: 1001,
        reason: "Stream end encountered",
        connectionLifetimeMs: 4_300,
        retryCount: 0,
        socketUrl: "wss://wallet.cp.cash/ws",
      }),
    })

    await act(async () => {
      renderer.unmount()
      await Promise.resolve()
    })
  })

  it("logs connect failures before the socket opens", async () => {
    mockConnect.mockResolvedValueOnce({
      ok: false,
      error: new Error("constructor failed"),
    })

    let renderer!: ReactTestRenderer

    await act(async () => {
      renderer = create(
        <SocketProvider>
          <></>
        </SocketProvider>,
      )
      await Promise.resolve()
    })

    expect(mockSetConnected).toHaveBeenCalledWith(false)
    expect(mockLogRuntimeWarn).toHaveBeenCalledWith({
      tag: "[socket.lifecycle]",
      component: "socket.lifecycle",
      event: "connect_failed",
      message: "WebSocket connection attempt failed before the socket opened.",
      details: expect.objectContaining({
        connectionId: 1,
        trigger: "sync",
        error: "constructor failed",
        retryCount: 0,
        socketUrl: "wss://wallet.cp.cash/ws",
      }),
    })

    await act(async () => {
      renderer.unmount()
      await Promise.resolve()
    })
  })
})
