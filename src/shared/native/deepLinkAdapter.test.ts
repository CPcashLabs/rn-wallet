const mockOpenURL = jest.fn()

jest.mock("react-native", () => ({
  Linking: {
    openURL: (...args: unknown[]) => mockOpenURL(...args),
  },
}))

import { deepLinkAdapter } from "@/shared/native/deepLinkAdapter"

describe("deepLinkAdapter", () => {
  beforeEach(() => {
    mockOpenURL.mockReset()
  })

  it("always reports deep-link support", () => {
    expect(deepLinkAdapter.getCapability()).toEqual({
      supported: true,
    })
  })

  it("parses valid urls and rejects empty or invalid inputs", () => {
    expect(deepLinkAdapter.parse(null)).toEqual({
      raw: null,
      isValid: false,
      scheme: null,
      host: null,
      pathSegments: [],
      query: {},
    })

    expect(deepLinkAdapter.parse("not-a-url")).toEqual({
      raw: "not-a-url",
      isValid: false,
      scheme: null,
      host: null,
      pathSegments: [],
      query: {},
    })

    expect(deepLinkAdapter.parse("cpcash://wallet/transfer/send?order=ORDER-1&network=btt#fragment")).toEqual({
      raw: "cpcash://wallet/transfer/send?order=ORDER-1&network=btt#fragment",
      isValid: true,
      scheme: "cpcash",
      host: "wallet",
      pathSegments: ["transfer", "send"],
      query: {
        order: "ORDER-1",
        network: "btt",
      },
    })
  })

  it("opens urls through the native linking module", async () => {
    mockOpenURL.mockResolvedValue(undefined)

    await expect(deepLinkAdapter.open("cpcash://wallet")).resolves.toEqual({
      ok: true,
      data: undefined,
    })

    expect(mockOpenURL).toHaveBeenCalledWith("cpcash://wallet")
  })

  it("normalizes open-url failures", async () => {
    mockOpenURL.mockRejectedValue("failed")

    const result = await deepLinkAdapter.open("cpcash://wallet")

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("Expected open to fail")
    }

    expect(result.error).toMatchObject({
      message: "Failed to open URL",
    })
  })
})
