import { readAuthSession, writeAuthSession } from "@/shared/api/auth-session"
import { mapApiError } from "@/shared/api/error-mapping"
import { registerInterceptors, setUnauthorizedHandler } from "@/shared/api/interceptors"
import {
  ApiError,
  AuthExpiredError,
  NativeCapabilityUnavailableError,
  NetworkUnavailableError,
  UnsafeUploadFileError,
} from "@/shared/errors"
import { useAuthStore } from "@/shared/store/useAuthStore"

import { walletSession } from "../../test-helpers/authFixtures"
import { resetAuthIntegrationState } from "../../test-helpers/authRuntime"
import { createAxiosError } from "../../test-helpers/axiosError"
import { createFakeAxiosClient } from "../../test-helpers/fakeAxiosClient"

describe("api error mapping integration", () => {
  beforeEach(async () => {
    await resetAuthIntegrationState()
  })

  it("throws explicit errors when fake axios interceptors have not been registered", () => {
    const harness = createFakeAxiosClient()

    expect(harness.createConfig().url).toBe("/api/orders/list")
    expect(() => harness.getRequestHandler()).toThrow("request interceptor not registered")
    expect(() => harness.getResponseSuccessHandler()).toThrow("response success interceptor not registered")
    expect(() => harness.getResponseErrorHandler()).toThrow("response error interceptor not registered")
  })

  it("maps unknown errors, transport failures, auth expiry, and oauth 401 payloads", () => {
    const existingError = new ApiError("existing", { status: 418, code: "TEAPOT" })

    expect(mapApiError(existingError)).toBe(existingError)

    expect(mapApiError(new Error("boom"))).toMatchObject({
      name: "ApiError",
      message: "Unknown API error",
      cause: expect.any(Error),
    })

    expect(
      mapApiError(
        createAxiosError({
          message: "socket hang up",
          response: undefined,
        }),
      ),
    ).toBeInstanceOf(NetworkUnavailableError)
    expect(
      mapApiError(
        createAxiosError({
          message: "",
          response: undefined,
        }),
      ),
    ).toMatchObject({
      name: "NetworkUnavailableError",
      message: "Network unavailable",
    })

    expect(
      mapApiError(
        createAxiosError({
          response: {
            status: 401,
            data: {
              message: "token expired",
            },
          },
        }),
      ),
    ).toBeInstanceOf(AuthExpiredError)

    expect(
      mapApiError(
        createAxiosError({
          config: {
            url: "/api/auth/oauth2/token",
          },
          response: {
            status: 401,
            data: {
              error_description: "invalid grant",
              error_code: "OAUTH_DENIED",
            },
          },
        }),
      ),
    ).toMatchObject({
      name: "ApiError",
      message: "invalid grant",
      code: "OAUTH_DENIED",
      status: 401,
    })

    expect(
      mapApiError(
        createAxiosError({
          response: {
            status: 422,
            data: "plain failure",
          },
        }),
      ),
    ).toMatchObject({
      name: "ApiError",
      message: "plain failure",
      status: 422,
    })

    expect(
      mapApiError(
        createAxiosError({
          response: {
            status: 400,
            data: {
              error: "bad request",
              code: 40001,
            },
          },
        }),
      ),
    ).toMatchObject({
      name: "ApiError",
      message: "bad request",
      code: "40001",
      status: 400,
    })

    expect(
      mapApiError(
        createAxiosError({
          message: "gateway issue",
          response: {
            status: 503,
            data: null,
          },
        }),
      ),
    ).toMatchObject({
      name: "ApiError",
      message: "gateway issue",
      status: 503,
    })

    expect(
      mapApiError(
        createAxiosError({
          message: "",
          response: {
            status: 400,
            data: {
              message: "",
              code: "",
            },
          },
        }),
      ),
    ).toMatchObject({
      name: "ApiError",
      message: "API request failed",
      code: "",
      status: 400,
    })
  })

  it("uses response interceptors to reject business errors and preserve successful envelopes", async () => {
    const harness = createFakeAxiosClient()
    registerInterceptors(harness.client)

    const successHandler = harness.getResponseSuccessHandler()
    const businessErrorResponse = {
      status: 400,
      data: {
        code: 500,
        message: "business failed",
      },
    }
    const unnamedBusinessErrorResponse = {
      status: 422,
      data: {
        code: 42201,
      },
    }
    const okResponse = {
      status: 200,
      data: {
        code: 200,
        message: "ok",
      },
    }
    const passthroughResponse = {
      status: 204,
      data: {},
    }

    await expect(Promise.resolve(successHandler(businessErrorResponse as never))).rejects.toMatchObject({
      name: "ApiError",
      message: "business failed",
      code: 500,
      status: 400,
    })
    await expect(Promise.resolve(successHandler(unnamedBusinessErrorResponse as never))).rejects.toMatchObject({
      name: "ApiError",
      message: "API request failed",
      code: 42201,
      status: 422,
    })
    await expect(Promise.resolve(successHandler(okResponse as never))).resolves.toBe(okResponse)
    await expect(Promise.resolve(successHandler(passthroughResponse as never))).resolves.toBe(passthroughResponse)
  })

  it("keeps auth state intact when oauth token refresh fails with 401", async () => {
    const unauthorizedSpy = jest.fn()
    setUnauthorizedHandler(unauthorizedSpy)
    useAuthStore.getState().setSession(walletSession)
    await writeAuthSession(walletSession)

    const harness = createFakeAxiosClient()
    registerInterceptors(harness.client)

    await expect(
      harness.getResponseErrorHandler()(
        createAxiosError({
          config: {
            url: "/api/auth/oauth2/token",
          },
          response: {
            status: 401,
            data: {
              error_description: "refresh denied",
            },
          },
        }),
      ),
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "refresh denied",
      status: 401,
    })

    expect(await readAuthSession()).toEqual(walletSession)
    expect(useAuthStore.getState().session).toEqual(walletSession)
    expect(unauthorizedSpy).not.toHaveBeenCalled()
  })

  it("exposes metadata through custom error types", () => {
    expect(new AuthExpiredError()).toMatchObject({
      name: "AuthExpiredError",
      message: "Authentication expired",
      code: "AUTH_EXPIRED",
      status: 401,
    })
    expect(new NetworkUnavailableError()).toMatchObject({
      name: "NetworkUnavailableError",
      message: "Network unavailable",
      code: "NETWORK_UNAVAILABLE",
    })
    expect(new NativeCapabilityUnavailableError("camera")).toMatchObject({
      name: "NativeCapabilityUnavailableError",
      capability: "camera",
      message: "camera is not available in the current app version",
    })
    expect(new NativeCapabilityUnavailableError("camera", "camera disabled")).toMatchObject({
      capability: "camera",
      message: "camera disabled",
    })
    expect(new UnsafeUploadFileError()).toMatchObject({
      name: "UnsafeUploadFileError",
      code: "INVALID_UPLOAD_FILE",
      message: "Unsafe upload file input",
    })
  })
})
