import { buildWebSocketAuthMessage } from "@/shared/config/runtime"

import { authenticateSocketConnection, isInternalSocketEvent } from "@/app/providers/socketAuth"

describe("socketAuth", () => {
  it("sends the access token as the first authenticate payload", async () => {
    const send = jest.fn(async () => ({ ok: true as const, data: undefined }))
    const disconnect = jest.fn(async () => ({ ok: true as const, data: undefined }))

    await expect(authenticateSocketConnection({ send, disconnect }, "socket-secret")).resolves.toBe(true)

    expect(send).toHaveBeenCalledWith(buildWebSocketAuthMessage("socket-secret"))
    expect(disconnect).not.toHaveBeenCalled()
  })

  it("disconnects the socket when the authenticate payload cannot be sent", async () => {
    const send = jest.fn(async () => ({ ok: false as const, error: new Error("send failed") }))
    const disconnect = jest.fn(async () => ({ ok: true as const, data: undefined }))

    await expect(authenticateSocketConnection({ send, disconnect }, "socket-secret")).resolves.toBe(false)

    expect(send).toHaveBeenCalledWith(buildWebSocketAuthMessage("socket-secret"))
    expect(disconnect).toHaveBeenCalledWith(4001, "auth_send_failed")
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
  })
})
