const mockConfigure = jest.fn()
const mockUseReactNative = jest.fn()
const mockConnect = jest.fn()
const mockClear = jest.fn()
const mockDisplay = jest.fn()

const mockReactotronClient = {
  configure: mockConfigure,
  useReactNative: mockUseReactNative,
  connect: mockConnect,
  clear: mockClear,
  display: mockDisplay,
}

jest.mock("reactotron-react-native", () => ({
  __esModule: true,
  default: mockReactotronClient,
}))

import {
  clearDevConsoleEntries,
  formatDevConsoleArgs,
  installDevConsoleCapture,
  recordDevConsoleEntry,
  resetDevConsoleClientForTests,
} from "@/shared/logging/devConsole"

describe("devConsole", () => {
  const runtime = globalThis as typeof globalThis & {
    __DEV__?: boolean
  }
  const originalDev = runtime.__DEV__

  beforeEach(() => {
    runtime.__DEV__ = true
    resetDevConsoleClientForTests()
    mockConfigure.mockReset().mockReturnValue(mockReactotronClient)
    mockUseReactNative.mockReset().mockReturnValue(mockReactotronClient)
    mockConnect.mockReset().mockReturnValue(mockReactotronClient)
    mockClear.mockReset()
    mockDisplay.mockReset()
  })

  afterEach(() => {
    runtime.__DEV__ = originalDev
    resetDevConsoleClientForTests()
  })

  it("formats structured runtime entries into readable multi-line summaries", () => {
    const message = formatDevConsoleArgs([
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

    expect(message).toContain("[socket.lifecycle] close_reconnecting")
    expect(message).toContain("WebSocket closed unexpectedly")
    expect(message).toContain("GET /ws status=101")
    expect(message).toContain("attempt=2")
  })

  it("serializes plain objects without turning the root object into a circular placeholder", () => {
    const message = formatDevConsoleArgs([
      "[plain.object]",
      {
        foo: "bar",
        nested: {
          count: 2,
        },
      },
    ])

    expect(message).toContain("\"foo\": \"bar\"")
    expect(message).not.toBe('[plain.object] "[Circular]"')
  })

  it("installs Reactotron once and forwards entries through display", () => {
    const client = installDevConsoleCapture()
    const secondClient = installDevConsoleCapture()

    expect(client).toBe(mockReactotronClient)
    expect(secondClient).toBe(mockReactotronClient)
    expect(mockConfigure).toHaveBeenCalledWith({ name: "CPCash RN" })
    expect(mockUseReactNative).toHaveBeenCalledWith({
      errors: true,
      log: true,
      networking: true,
      editor: false,
      overlay: false,
      asyncStorage: false,
      storybook: false,
      devTools: false,
    })
    expect(mockConnect).toHaveBeenCalledTimes(1)

    recordDevConsoleEntry("warn", [
      "[runtime.warn]",
      {
        event: "business_error",
        message: "status=400 code=500",
      },
    ])

    expect(mockDisplay).toHaveBeenCalledWith({
      name: "log.warn",
      preview: "[runtime.warn] business_error",
      value: {
        level: "warn",
        message: "[runtime.warn] business_error\nstatus=400 code=500",
      },
      important: true,
    })
  })

  it("clears the Reactotron timeline in development mode", () => {
    installDevConsoleCapture()
    clearDevConsoleEntries()

    expect(mockClear).toHaveBeenCalledTimes(1)
  })
})
