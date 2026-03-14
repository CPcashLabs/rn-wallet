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
})
