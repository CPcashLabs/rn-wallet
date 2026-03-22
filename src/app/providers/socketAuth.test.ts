import {
  isInternalSocketEvent,
  isSocketAuthAckEvent,
} from "@/app/providers/socketAuth"

describe("socketAuth", () => {
  it("treats auth ack and pong messages as internal events", () => {
    expect(isInternalSocketEvent("pong")).toBe(true)
    expect(isInternalSocketEvent("authenticated")).toBe(true)
    expect(isInternalSocketEvent("  AUTH-OK  ")).toBe(true)
    expect(isInternalSocketEvent("messageRefresh")).toBe(false)
    expect(isInternalSocketEvent()).toBe(false)
  })

  it("detects explicit socket auth ack events", () => {
    expect(isSocketAuthAckEvent("authenticated")).toBe(true)
    expect(isSocketAuthAckEvent(" auth_success ")).toBe(true)
    expect(isSocketAuthAckEvent("pong")).toBe(false)
  })
})
