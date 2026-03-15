import { logErrorSafely, sanitizeLogValue } from "@/shared/logging/safeConsole"

describe("safeConsole", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("redacts sensitive values from production error summaries", () => {
    const token = "secret-token-value-1234567890"
    const address = "0x1234567890abcdef1234567890abcdef12345678"
    const txid = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    const orderId = "ORDER_123"
    const error = Object.assign(new Error(`GET https://cp.cash/api/order/${txid}?access_token=${token}&address=${address}`), {
      name: "AxiosError",
      code: "ERR_BAD_REQUEST",
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          access_token: token,
        },
      },
      config: {
        method: "get",
        baseURL: "https://cp.cash",
        url: `/api/order/member/order/cp-cash-show/${orderId}?access_token=${token}&address=${address}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          address,
        },
      },
    })

    const sanitized = sanitizeLogValue(error)
    const serialized = JSON.stringify(sanitized)

    expect(serialized).toContain("AxiosError")
    expect(serialized).toContain("ERR_BAD_REQUEST")
    expect(serialized).toContain("\"status\":401")
    expect(serialized).toContain(txid)
    expect(serialized).toContain(orderId)
    expect(serialized).not.toContain(token)
    expect(serialized).not.toContain(address)
    expect(serialized).not.toContain("Authorization")
    expect(serialized).not.toContain("\"data\":{")
  })

  it("redacts addresses when they are followed by path or query delimiters", () => {
    const evmAddress = "0X1234567890ABCDEF1234567890ABCDEF12345678"
    const tronAddress = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"

    expect(sanitizeLogValue(`https://cp.cash/wallet/${evmAddress}/details`)).toBe(
      "https://cp.cash/wallet/[REDACTED_EVM_ADDRESS]/details",
    )
    expect(sanitizeLogValue(`tron:${tronAddress}?network=tron`)).toBe("tron:[REDACTED_TRON_ADDRESS]?network=tron")
  })

  it("keeps diagnostic path identifiers but redacts query txid", () => {
    const txid = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    const sanitized = sanitizeLogValue(`/api/order/${txid}/trace?txid=${txid}&order_sn=ORDER_123`)

    expect(sanitized).toBe(`/api/order/${txid}/trace?txid=[REDACTED]&order_sn=[REDACTED]`)
  })

  it("logs only sanitized summaries in production mode", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    const token = "secret-token-value-1234567890"
    const email = "wallet@example.com"
    const address = "0x1234567890abcdef1234567890abcdef12345678"
    const error = new Error(`Bearer ${token} failed for ${email} at ${address}`)

    logErrorSafely("[test]", error, {
      context: {
        componentStack: "\n    in Foo\n    in Bar",
        accessToken: token,
      },
      devMode: false,
    })

    expect(spy).toHaveBeenCalledTimes(1)
    const serialized = JSON.stringify(spy.mock.calls[0])

    expect(serialized).toContain("[test]")
    expect(serialized).toContain("\"componentStackFrames\":2")
    expect(serialized).not.toContain(token)
    expect(serialized).not.toContain(email)
    expect(serialized).not.toContain(address)
  })

  it("keeps raw values in development mode", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("boom")
    const context = { extra: "info" }

    logErrorSafely("[test]", error, {
      context,
      devMode: true,
    })

    expect(spy).toHaveBeenCalledWith("[test]", error, context)
  })

  it("summarizes arrays, unknown objects and plain objects without leaking secrets", () => {
    const longToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature"
    expect(sanitizeLogValue(["a", "b", "c"])).toEqual({
      kind: "Array",
      length: 3,
    })

    expect(
      sanitizeLogValue({
        name: "AxiosError",
        message: `Bearer ${longToken} for user wallet@example.com`,
        ok: false,
        componentStack: "\n in Foo\n in Bar",
        config: {
          method: "post",
          baseURL: "https://cp.cash",
          url: "/api/auth?token=secret",
          timeout: 1000,
        },
        response: {
          status: 403,
          data: {
            foo: "bar",
          },
        },
      }),
    ).toEqual({
      name: "AxiosError",
      message: "Bearer [REDACTED] for user [REDACTED_EMAIL]",
      ok: false,
      componentStackFrames: 2,
      config: {
        method: "POST",
        baseURL: "https://cp.cash",
        url: "/api/auth?token=[REDACTED]",
        timeout: 1000,
      },
      response: {
        status: 403,
        dataType: "object",
      },
      status: 403,
    })

    expect(sanitizeLogValue(new Map())).toBe("[object Map]")
  })

  it("summarizes axios payload shapes for array and null response bodies", () => {
    expect(
      sanitizeLogValue({
        name: "AxiosError",
        isAxiosError: true,
        response: {
          status: 200,
          data: ["a", "b"],
        },
      }),
    ).toEqual({
      name: "AxiosError",
      response: {
        status: 200,
        dataType: "array(2)",
      },
      status: 200,
    })

    expect(
      sanitizeLogValue({
        name: "AxiosError",
        isAxiosError: true,
        response: {
          status: 204,
          data: null,
        },
      }),
    ).toEqual({
      name: "AxiosError",
      response: {
        status: 204,
        dataType: "null",
      },
      status: 204,
    })
  })

  it("truncates overly long sanitized strings and logs production summaries without context", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    const longMessage = `token=${"x".repeat(240)}`

    const sanitized = sanitizeLogValue(longMessage)
    expect(typeof sanitized).toBe("string")
    expect((sanitized as string).endsWith("...")).toBe(true)

    logErrorSafely("[prod]", new Error("wallet@example.com failed"), {
      devMode: false,
    })

    expect(spy).toHaveBeenCalledWith("[prod]", {
      name: "Error",
      message: "[REDACTED_EMAIL] failed",
    })
  })

  it("preserves null and scalar values while summarizing empty objects and error causes", () => {
    expect(sanitizeLogValue(null)).toBeNull()
    expect(sanitizeLogValue(123n)).toBe(123n)
    expect(sanitizeLogValue({})).toEqual({
      kind: "Object",
    })
    expect(
      sanitizeLogValue(
        Object.assign(new Error("failed"), {
          status: 418,
          cause: {
            type: "request",
            url: "https://cp.cash/api?code=secret",
            baseURL: "https://cp.cash",
          },
        }),
      ),
    ).toEqual({
      name: "Error",
      message: "failed",
      status: 418,
      cause: {
        type: "request",
        url: "https://cp.cash/api?[REDACTED_QUERY]",
        baseURL: "https://cp.cash",
      },
    })
  })

  it("keeps code, status and nested causes when summarizing plain objects", () => {
    expect(
      sanitizeLogValue({
        code: 409,
        status: 418,
        cause: {
          url: "https://cp.cash/api?token=secret",
        },
      }),
    ).toEqual({
      code: "409",
      status: 418,
      cause: {
        url: "https://cp.cash/api?[REDACTED_QUERY]",
      },
    })
  })

  it("logs raw development errors without context when debug mode is enabled", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("boom")

    logErrorSafely("[dev]", error, {
      devMode: true,
    })

    expect(spy).toHaveBeenCalledWith("[dev]", error)
  })
})
