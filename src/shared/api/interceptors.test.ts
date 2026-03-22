import { AuthExpiredError, NetworkUnavailableError } from "@/shared/errors"

const mockReadTokenPair = jest.fn()
const mockClearAuthSession = jest.fn()
const mockMapApiError = jest.fn()
const mockResolveAcceptLanguage = jest.fn()
const mockResetProfileSyncSession = jest.fn()
const mockClearSession = jest.fn()
const mockLogInfoSafely = jest.fn()
const mockLogWarnSafely = jest.fn()

jest.mock("@/shared/api/auth-session", () => ({
  clearAuthSession: (...args: unknown[]) => mockClearAuthSession(...args),
  readTokenPair: (...args: unknown[]) => mockReadTokenPair(...args),
}))

jest.mock("@/shared/api/error-mapping", () => ({
  mapApiError: (...args: unknown[]) => mockMapApiError(...args),
}))

jest.mock("@/shared/api/language-header", () => ({
  resolveAcceptLanguage: () => mockResolveAcceptLanguage(),
}))

jest.mock("@/shared/session/profileSyncSession", () => ({
  resetProfileSyncSession: () => mockResetProfileSyncSession(),
}))

jest.mock("@/shared/logging/safeConsole", () => ({
  logInfoSafely: (...args: unknown[]) => mockLogInfoSafely(...args),
  logWarnSafely: (...args: unknown[]) => mockLogWarnSafely(...args),
}))

jest.mock("@/shared/store/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({
      clearSession: mockClearSession,
    }),
  },
}))

import {
  registerInterceptors,
  setNetworkUnavailableHandler,
  setUnauthorizedHandler,
} from "@/shared/api/interceptors"

type RequestInterceptor = (config: {
  url?: string
  headers: {
    set: (key: string, value: string) => void
  }
}) => Promise<unknown>

type SuccessResponseInterceptor = (response: {
  data?: unknown
  config?: {
    method?: string
    url?: string
    timeout?: number
  }
  status: number
}) => Promise<unknown>

type ErrorResponseInterceptor = (error: unknown) => Promise<unknown>

describe("registerInterceptors", () => {
  let requestInterceptor: RequestInterceptor
  let successResponseInterceptor: SuccessResponseInterceptor
  let errorResponseInterceptor: ErrorResponseInterceptor

  beforeEach(() => {
    mockReadTokenPair.mockReset()
    mockClearAuthSession.mockReset()
    mockMapApiError.mockReset()
    mockResolveAcceptLanguage.mockReset()
    mockResetProfileSyncSession.mockReset()
    mockClearSession.mockReset()
    mockLogInfoSafely.mockReset()
    mockLogWarnSafely.mockReset()
    setUnauthorizedHandler(null)
    setNetworkUnavailableHandler(null)

    const client = {
      interceptors: {
        request: {
          use: jest.fn((handler: RequestInterceptor) => {
            requestInterceptor = handler
          }),
        },
        response: {
          use: jest.fn((success: SuccessResponseInterceptor, error: ErrorResponseInterceptor) => {
            successResponseInterceptor = success
            errorResponseInterceptor = error
          }),
        },
      },
    }

    registerInterceptors(client as never)
  })

  it("attaches language and bearer headers to regular requests", async () => {
    mockResolveAcceptLanguage.mockReturnValue("zh-CN")
    mockReadTokenPair.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })
    const headers = {
      set: jest.fn(),
    }

    const config = await requestInterceptor({
      url: "/api/order/member/order/cp-cash-show/ORDER-1",
      headers,
    })

    expect(config).toMatchObject({
      url: "/api/order/member/order/cp-cash-show/ORDER-1",
    })
    expect(headers.set).toHaveBeenCalledWith("Accept-Language", "zh-CN")
    expect(headers.set).toHaveBeenCalledWith("Authorization", "Bearer access-token")
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[api.request]", {
      context: {
        component: "api.interceptors",
        event: "attach_headers",
        message: "Prepared outbound request headers.",
        httpRequest: {
          requestMethod: undefined,
          requestUrl: "/api/order/member/order/cp-cash-show/ORDER-1",
          status: undefined,
        },
        details: {
          acceptLanguage: "zh-CN",
          hasAccessToken: true,
          authorizationAttached: true,
          config: {
            method: undefined,
            baseURL: undefined,
            url: "/api/order/member/order/cp-cash-show/ORDER-1",
            timeout: undefined,
          },
        },
      },
      forwardToConsole: false,
    })
  })

  it("omits the bearer header for oauth token requests", async () => {
    mockResolveAcceptLanguage.mockReturnValue("en-US")
    mockReadTokenPair.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })
    const headers = {
      set: jest.fn(),
    }

    await requestInterceptor({
      url: "/api/auth/oauth2/token",
      headers,
    })

    expect(headers.set).toHaveBeenCalledWith("Accept-Language", "en-US")
    expect(headers.set).not.toHaveBeenCalledWith("Authorization", expect.any(String))
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[api.request]", {
      context: {
        component: "api.interceptors",
        event: "attach_headers",
        message: "Prepared outbound request headers.",
        httpRequest: {
          requestMethod: undefined,
          requestUrl: "/api/auth/oauth2/token",
          status: undefined,
        },
        details: {
          acceptLanguage: "en-US",
          hasAccessToken: true,
          authorizationAttached: false,
          config: {
            method: undefined,
            baseURL: undefined,
            url: "/api/auth/oauth2/token",
            timeout: undefined,
          },
        },
      },
      forwardToConsole: false,
    })
  })

  it("rejects envelopes whose business code is not 200", async () => {
    await expect(
      successResponseInterceptor({
        status: 400,
        config: {
          method: "post",
          url: "/api/order",
          timeout: 15_000,
        },
        data: {
          code: 500,
          message: "business failed",
        },
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "business failed",
      status: 400,
      code: 500,
    })
    expect(mockLogWarnSafely).toHaveBeenCalledWith("[api.response]", {
      context: {
        component: "api.interceptors",
        event: "business_error",
        message: "API response returned a non-success business code.",
        httpRequest: {
          requestMethod: "POST",
          requestUrl: "/api/order",
          status: 400,
        },
        details: {
          businessCode: "500",
          config: {
            method: "post",
            baseURL: undefined,
            url: "/api/order",
            timeout: 15_000,
          },
        },
      },
      forwardToConsole: false,
    })
  })

  it("falls back to the generic api message when a failing envelope has no message", async () => {
    await expect(
      successResponseInterceptor({
        status: 400,
        data: {
          code: 500,
        },
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "API request failed",
      status: 400,
      code: 500,
    })
  })

  it("passes successful responses through untouched", async () => {
    const response = {
      status: 200,
      data: {
        code: 200,
        message: "ok",
      },
    }

    expect(await successResponseInterceptor(response)).toBe(response)
  })

  it("clears auth state and calls the unauthorized handler when auth expires", async () => {
    const mappedError = new AuthExpiredError("expired")
    const unauthorizedHandler = jest.fn()
    mockMapApiError.mockReturnValue(mappedError)
    mockClearAuthSession.mockResolvedValue(undefined)
    setUnauthorizedHandler(unauthorizedHandler)

    await expect(errorResponseInterceptor(new Error("raw"))).rejects.toBe(mappedError)

    expect(mockClearAuthSession).toHaveBeenCalledTimes(1)
    expect(mockResetProfileSyncSession).toHaveBeenCalledTimes(1)
    expect(mockClearSession).toHaveBeenCalledTimes(1)
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1)
    expect(mockLogWarnSafely).toHaveBeenCalledWith("[api.response]", {
      context: {
        component: "api.interceptors",
        event: "auth_expired",
        message: "Cleared local auth state after receiving an expired-session response.",
        details: {
          unauthorizedHandlerRegistered: true,
        },
      },
      forwardToConsole: false,
    })
  })

  it("calls the network unavailable handler for mapped offline errors", async () => {
    const mappedError = new NetworkUnavailableError("offline")
    const networkHandler = jest.fn()
    mockMapApiError.mockReturnValue(mappedError)
    setNetworkUnavailableHandler(networkHandler)

    await expect(errorResponseInterceptor(new Error("raw"))).rejects.toBe(mappedError)

    expect(networkHandler).toHaveBeenCalledTimes(1)
    expect(mockClearAuthSession).not.toHaveBeenCalled()
    expect(mockLogWarnSafely).toHaveBeenCalledWith("[api.response]", {
      context: {
        component: "api.interceptors",
        event: "network_unavailable",
        message: "Raised the offline handler after mapping a network-unavailable error.",
        details: {
          networkHandlerRegistered: true,
        },
      },
      forwardToConsole: false,
    })
  })
})
