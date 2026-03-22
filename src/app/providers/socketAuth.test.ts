import { buildWebSocketAuthMessage } from "@/shared/config/runtime"

const mockLogInfoSafely = jest.fn()
const mockLogWarnSafely = jest.fn()

jest.mock("@/shared/logging/safeConsole", () => ({
  logInfoSafely: (...args: unknown[]) => mockLogInfoSafely(...args),
  logWarnSafely: (...args: unknown[]) => mockLogWarnSafely(...args),
}))

import { authenticateSocketConnection, isInternalSocketEvent } from "@/app/providers/socketAuth"

describe("socketAuth", () => {
  beforeEach(() => {
    mockLogInfoSafely.mockReset()
    mockLogWarnSafely.mockReset()
  })

  it("sends the access token as the first authenticate payload", async () => {
    const send = jest.fn(async () => ({ ok: true as const, data: undefined }))
    const disconnect = jest.fn(async () => ({ ok: true as const, data: undefined }))

    await expect(authenticateSocketConnection({ send, disconnect }, "socket-secret")).resolves.toBe(true)

    expect(send).toHaveBeenCalledWith(buildWebSocketAuthMessage("socket-secret"))
    expect(disconnect).not.toHaveBeenCalled()
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.auth]", {
      context: {
        component: "socket.auth",
        event: "authenticate_succeeded",
        message: "Authenticated the socket connection successfully.",
        details: {
          hasAccessToken: true,
        },
      },
      forwardToConsole: false,
    })
  })

  it("disconnects the socket when the authenticate payload cannot be sent", async () => {
    const send = jest.fn(async () => ({ ok: false as const, error: new Error("send failed") }))
    const disconnect = jest.fn(async () => ({ ok: true as const, data: undefined }))

    await expect(authenticateSocketConnection({ send, disconnect }, "socket-secret")).resolves.toBe(false)

    expect(send).toHaveBeenCalledWith(buildWebSocketAuthMessage("socket-secret"))
    expect(disconnect).toHaveBeenCalledWith(4001, "auth_send_failed")
    expect(mockLogWarnSafely).toHaveBeenCalledWith("[socket.auth]", {
      context: {
        component: "socket.auth",
        event: "authenticate_failed",
        message: "Failed to send the socket authentication payload and disconnected the socket.",
        details: {
          hasAccessToken: true,
          reason: "send failed",
        },
      },
      forwardToConsole: false,
    })
  })

  it("treats auth ack and pong messages as internal events", () => {
    expect(isInternalSocketEvent("pong")).toBe(true)
    expect(isInternalSocketEvent("authenticated")).toBe(true)
    expect(isInternalSocketEvent("  AUTH-OK  ")).toBe(true)
    expect(isInternalSocketEvent("messageRefresh")).toBe(false)
    expect(isInternalSocketEvent()).toBe(false)
  })

  it("skips authentication when there is no access token", async () => {
    const send = jest.fn(async () => ({ ok: true as const, data: undefined }))
    const disconnect = jest.fn(async () => ({ ok: true as const, data: undefined }))

    await expect(authenticateSocketConnection({ send, disconnect }, null)).resolves.toBe(true)

    expect(send).not.toHaveBeenCalled()
    expect(disconnect).not.toHaveBeenCalled()
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.auth]", {
      context: {
        component: "socket.auth",
        event: "skip_authentication",
        message: "Skipped socket authentication because no access token is available.",
        details: {
          hasAccessToken: false,
        },
      },
      forwardToConsole: false,
    })
  })
})
