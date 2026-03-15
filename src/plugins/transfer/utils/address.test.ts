import {
  buildAddressRegexes,
  extractTransferAddress,
  extractTransferAddressByChainType,
  isTronChainName,
  resolveTransferChainType,
  resolveTransferAddressFromUnknownChain,
} from "@/plugins/transfer/utils/address"

describe("transfer address utils", () => {
  it("extracts a TRON address from qr payload urls", () => {
    expect(extractTransferAddressByChainType("tron://transfer?address=TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7", "TRON")).toBe(
      "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7",
    )
  })

  it("extracts an EVM address from arbitrary text", () => {
    expect(
      extractTransferAddress("send to 0x1234567890abcdef1234567890abcdef12345678 now", buildAddressRegexes([], "ETH")),
    ).toBe("0x1234567890abcdef1234567890abcdef12345678")
  })

  it("resolves scanned chain types from mixed qr content", () => {
    expect(resolveTransferAddressFromUnknownChain("https://example.com/pay?to=TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7")).toEqual({
      address: "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7",
      chainType: "TRON",
    })

    expect(resolveTransferAddressFromUnknownChain("ethereum:0x1234567890abcdef1234567890abcdef12345678")).toEqual({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainType: "EVM",
    })
  })

  it("returns null when qr content does not contain a wallet address", () => {
    expect(resolveTransferAddressFromUnknownChain("https://example.com/order/123")).toBeNull()
  })

  it("detects tron chain names and builds fallback regexes", () => {
    expect(isTronChainName("  tron mainnet ")).toBe(true)
    expect(resolveTransferChainType("ETH")).toBe("EVM")
    expect(buildAddressRegexes(["[", "^T[a-zA-Z0-9]{33}$"], "TRON")).toHaveLength(1)
    expect(buildAddressRegexes(undefined, "TRON")[0].test("TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7")).toBe(true)
    expect(buildAddressRegexes(undefined, "ETH")[0].test("0x1234567890abcdef1234567890abcdef12345678")).toBe(true)
  })

  it("extracts decoded and quoted addresses from unknown content", () => {
    expect(
      extractTransferAddress(
        "\"https://example.com/pay?recipient=TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7\"",
        buildAddressRegexes(undefined, "TRON"),
      ),
    ).toBe("TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7")

    expect(
      extractTransferAddress(
        "to=0x1234567890abcdef1234567890abcdef12345678",
        buildAddressRegexes(undefined, "ETH"),
      ),
    ).toBe("0x1234567890abcdef1234567890abcdef12345678")
  })

  it("handles empty, malformed and partial address candidates", () => {
    const shiftedRegex = /(?:0x|0X)?[a-fA-F0-9]{40}/g
    shiftedRegex.lastIndex = 100

    expect(extractTransferAddress("\"\"", buildAddressRegexes(undefined, "ETH"))).toBe("")

    expect(
      extractTransferAddress(
        "%E0%A4%A",
        buildAddressRegexes(undefined, "ETH"),
      ),
    ).toBe("")

    expect(
      extractTransferAddress(
        "https://example.com/pay?address=%E0%A4%A0x1234567890abcdef1234567890abcdef12345678",
        buildAddressRegexes(undefined, "ETH"),
      ),
    ).toBe("0x1234567890abcdef1234567890abcdef12345678")

    expect(
      extractTransferAddress(
        "0x1234567890abcdef1234567890abcdef12345678",
        [shiftedRegex],
      ),
    ).toBe("0x1234567890abcdef1234567890abcdef12345678")
  })
})
