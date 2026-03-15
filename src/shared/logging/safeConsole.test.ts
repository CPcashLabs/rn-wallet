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
})
