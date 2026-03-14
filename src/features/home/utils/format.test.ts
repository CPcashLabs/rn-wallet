import { formatAddress, formatCurrency, formatTokenAmount } from "@/features/home/utils/format"

describe("format utils", () => {
  it("returns an empty string for missing addresses", () => {
    expect(formatAddress()).toBe("")
  })

  it("keeps short addresses unchanged", () => {
    expect(formatAddress("0x1234567890")).toBe("0x1234567890")
  })

  it("truncates long addresses with head and tail", () => {
    expect(formatAddress("T1234567890ABCDEFGHIJKLMN")).toBe("T12345...KLMN")
  })

  it("formats currency with a fallback for non-finite values", () => {
    expect(formatCurrency(1234.5)).toBe("$ 1,234.50")
    expect(formatCurrency(Number.NaN, "USDT")).toBe("USDT --.--")
  })

  it("formats token amounts and guards non-finite input", () => {
    expect(formatTokenAmount(12.3456789)).toBe("12.345679")
    expect(formatTokenAmount(Number.POSITIVE_INFINITY)).toBe("--")
  })
})
