import { mapApiError } from "@/shared/api/error-mapping"
import { ApiError, AuthExpiredError, NetworkUnavailableError } from "@/shared/errors"

function createAxiosError(overrides: Record<string, unknown> = {}) {
  return {
    name: "AxiosError",
    message: "Request failed",
    isAxiosError: true,
    config: {
      url: "/api/orders/list",
    },
    ...overrides,
  }
}

describe("mapApiError", () => {
  it("returns existing ApiError instances unchanged", () => {
    const error = new ApiError("boom", { status: 400, code: "BAD_REQUEST" })

    expect(mapApiError(error)).toBe(error)
  })

  it("wraps non-axios errors as generic ApiError", () => {
    const mapped = mapApiError(new Error("boom"))

    expect(mapped).toBeInstanceOf(ApiError)
    expect(mapped).not.toBeInstanceOf(AuthExpiredError)
    expect(mapped.message).toBe("Unknown API error")
  })

  it("maps axios transport failures to NetworkUnavailableError", () => {
    const mapped = mapApiError(createAxiosError({ message: "socket hang up", response: undefined }))

    expect(mapped).toBeInstanceOf(NetworkUnavailableError)
    expect(mapped.message).toBe("socket hang up")
  })

  it("falls back to the default network message when transport failures have no message", () => {
    const mapped = mapApiError(createAxiosError({ message: "", response: undefined }))

    expect(mapped).toBeInstanceOf(NetworkUnavailableError)
    expect(mapped.message).toBe("Network unavailable")
  })

  it("keeps canceled axios requests out of the offline fallback flow", () => {
    const mapped = mapApiError(
      createAxiosError({
        name: "CanceledError",
        message: "canceled by caller",
        code: "ERR_CANCELED",
        response: undefined,
      }),
    )

    expect(mapped).toBeInstanceOf(ApiError)
    expect(mapped).not.toBeInstanceOf(NetworkUnavailableError)
    expect(mapped).toMatchObject({
      name: "CanceledError",
      message: "canceled by caller",
      code: "ERR_CANCELED",
    })
  })

  it("maps non-token 401 responses to AuthExpiredError", () => {
    const mapped = mapApiError(
      createAxiosError({
        response: {
          status: 401,
          data: {
            message: "token expired",
          },
        },
      }),
    )

    expect(mapped).toBeInstanceOf(AuthExpiredError)
    expect(mapped.message).toBe("Session expired")
  })

  it("keeps oauth token endpoint 401 responses as ApiError", () => {
    const mapped = mapApiError(
      createAxiosError({
        config: {
          url: "/api/auth/oauth2/token",
        },
        response: {
          status: 401,
          data: {
            error_description: "invalid grant",
            error_code: "INVALID_GRANT",
          },
        },
      }),
    )

    expect(mapped).toBeInstanceOf(ApiError)
    expect(mapped).not.toBeInstanceOf(AuthExpiredError)
    expect(mapped.message).toBe("invalid grant")
    expect((mapped as ApiError).code).toBe("INVALID_GRANT")
    expect((mapped as ApiError).status).toBe(401)
  })

  it("extracts plain-string response messages", () => {
    const mapped = mapApiError(
      createAxiosError({
        response: {
          status: 500,
          data: "  service unavailable  ",
        },
      }),
    )

    expect(mapped).toBeInstanceOf(ApiError)
    expect(mapped.message).toBe("service unavailable")
    expect((mapped as ApiError).status).toBe(500)
  })

  it("extracts numeric codes and fallback error fields from response payloads", () => {
    const mapped = mapApiError(
      createAxiosError({
        response: {
          status: 400,
          data: {
            message: "",
            error_description: "",
            error: "invalid amount",
            code: 42,
          },
        },
      }),
    )

    expect(mapped).toBeInstanceOf(ApiError)
    expect(mapped.message).toBe("invalid amount")
    expect((mapped as ApiError).code).toBe("42")
  })

  it("preserves explicit string codes and falls back to empty response fields when needed", () => {
    const explicitCode = mapApiError(
      createAxiosError({
        response: {
          status: 409,
          data: {
            message: "already exists",
            code: "DUPLICATE_ORDER",
          },
        },
      }),
    )
    const emptyFields = mapApiError(
      createAxiosError({
        message: "",
        response: {
          status: 422,
          data: {
            message: "",
            error_description: "",
            error: "",
          },
        },
      }),
    )

    expect((explicitCode as ApiError).code).toBe("DUPLICATE_ORDER")
    expect(emptyFields.message).toBe("API request failed")
    expect((emptyFields as ApiError).code).toBe("")
  })

  it("falls back to the axios message or the generic api message when response data is unusable", () => {
    const messageFallback = mapApiError(
      createAxiosError({
        message: "Gateway timeout",
        response: {
          status: 504,
          data: "   ",
        },
      }),
    )
    const genericFallback = mapApiError(
      createAxiosError({
        message: "",
        response: {
          status: 500,
          data: null,
        },
      }),
    )

    expect(messageFallback.message).toBe("Gateway timeout")
    expect(genericFallback.message).toBe("API request failed")
  })
})
