const mockLogErrorSafely = jest.fn()
const mockLogInfoSafely = jest.fn()
const mockLogWarnSafely = jest.fn()

jest.mock("@/shared/logging/safeConsole", () => ({
  logErrorSafely: (...args: unknown[]) => mockLogErrorSafely(...args),
  logInfoSafely: (...args: unknown[]) => mockLogInfoSafely(...args),
  logWarnSafely: (...args: unknown[]) => mockLogWarnSafely(...args),
}))

import { logRuntimeError, logRuntimeInfo, logRuntimeWarn } from "@/shared/logging/appLogger"

describe("appLogger", () => {
  beforeEach(() => {
    mockLogErrorSafely.mockReset()
    mockLogInfoSafely.mockReset()
    mockLogWarnSafely.mockReset()
  })

  it("routes runtime info logs through safeConsole with console forwarding disabled", () => {
    logRuntimeInfo({
      tag: "[api.request]",
      component: "api.interceptors",
      event: "attach_headers",
      message: "Prepared outbound request headers.",
      details: {
        hasAccessToken: true,
      },
      httpRequest: {
        requestMethod: "GET",
        requestUrl: "/api/profile",
        status: 200,
      },
    })

    expect(mockLogInfoSafely).toHaveBeenCalledWith("[api.request]", {
      context: {
        component: "api.interceptors",
        event: "attach_headers",
        message: "Prepared outbound request headers.",
        details: {
          hasAccessToken: true,
        },
        httpRequest: {
          requestMethod: "GET",
          requestUrl: "/api/profile",
          status: 200,
        },
      },
      forwardToConsole: false,
    })
  })

  it("omits optional runtime fields when they are not provided", () => {
    logRuntimeWarn({
      tag: "[socket.lifecycle]",
      component: "socket.lifecycle",
      event: "close_stopped",
      message: "WebSocket closed repeatedly and reconnecting was stopped.",
    })

    expect(mockLogWarnSafely).toHaveBeenCalledWith("[socket.lifecycle]", {
      context: {
        component: "socket.lifecycle",
        event: "close_stopped",
        message: "WebSocket closed repeatedly and reconnecting was stopped.",
      },
      forwardToConsole: false,
    })
  })

  it("routes runtime errors through safeConsole with structured context", () => {
    const error = new Error("profile sync failed")

    logRuntimeError({
      tag: "[profile.sync]",
      component: "profile.sync",
      event: "failed",
      message: "Swallowed a profile sync failure and kept the cached profile unchanged.",
      details: {
        force: true,
      },
      error,
    })

    expect(mockLogErrorSafely).toHaveBeenCalledWith("[profile.sync]", error, {
      context: {
        component: "profile.sync",
        event: "failed",
        message: "Swallowed a profile sync failure and kept the cached profile unchanged.",
        details: {
          force: true,
        },
      },
      forwardToConsole: false,
    })
  })
})
