import {
  clearDevConsoleEntries,
  getDevConsoleEntriesByFilter,
  recordDevConsoleEntry,
} from "@/shared/logging/devConsole"

describe("devConsole", () => {
  afterEach(() => {
    clearDevConsoleEntries()
  })

  it("formats structured runtime entries into readable multi-line summaries", () => {
    const runtime = globalThis as typeof globalThis & {
      __DEV__?: boolean
    }
    const originalDev = runtime.__DEV__

    runtime.__DEV__ = true

    try {
      recordDevConsoleEntry("warn", [
        "[socket.lifecycle]",
        {
          component: "socket.lifecycle",
          event: "close_reconnecting",
          message: "WebSocket closed unexpectedly and scheduled a reconnect.",
          details: {
            code: 1006,
            reason: "server_closed",
            attempt: 2,
            delayMs: 3000,
          },
          httpRequest: {
            requestMethod: "get",
            requestUrl: "/ws",
            status: 101,
          },
        },
      ])
    } finally {
      runtime.__DEV__ = originalDev
    }

    expect(getDevConsoleEntriesByFilter("warn")[0]?.message).toContain("[socket.lifecycle] close_reconnecting")
    expect(getDevConsoleEntriesByFilter("warn")[0]?.message).toContain("WebSocket closed unexpectedly")
    expect(getDevConsoleEntriesByFilter("warn")[0]?.message).toContain("GET /ws status=101")
    expect(getDevConsoleEntriesByFilter("warn")[0]?.message).toContain("attempt=2")
  })

  it("serializes plain objects without turning the root object into a circular placeholder", () => {
    const runtime = globalThis as typeof globalThis & {
      __DEV__?: boolean
    }
    const originalDev = runtime.__DEV__

    runtime.__DEV__ = true

    try {
      recordDevConsoleEntry("info", [
        "[plain.object]",
        {
          foo: "bar",
          nested: {
            count: 2,
          },
        },
      ])
    } finally {
      runtime.__DEV__ = originalDev
    }

    expect(getDevConsoleEntriesByFilter("runtime")[0]?.message).toContain("\"foo\": \"bar\"")
    expect(getDevConsoleEntriesByFilter("runtime")[0]?.message).not.toBe('[plain.object] "[Circular]"')
  })
})
