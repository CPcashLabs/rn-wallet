import {
  buildAddressRegexes,
  extractTransferAddress,
  extractTransferAddressByChainType,
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
})
