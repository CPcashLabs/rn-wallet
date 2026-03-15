import { toNumber, toStringValue, toTimestamp } from "@/shared/api/normalize"

describe("normalize api helpers", () => {
  it("normalizes numbers and numeric strings", () => {
    expect(toNumber(12)).toBe(12)
    expect(toNumber(" 42 ")).toBe(42)
    expect(toNumber(Number.POSITIVE_INFINITY)).toBe(0)
    expect(toNumber("oops")).toBe(0)
    expect(toNumber("")).toBe(0)
    expect(toNumber(null)).toBe(0)
  })

  it("converts nullable values into strings", () => {
    expect(toStringValue(null)).toBe("")
    expect(toStringValue(undefined)).toBe("")
    expect(toStringValue(123)).toBe("123")
    expect(toStringValue(false)).toBe("false")
  })

  it("normalizes timestamps from numbers and strings", () => {
    expect(toTimestamp(123)).toBe(123)
    expect(toTimestamp(Number.NaN)).toBeNull()
    expect(toTimestamp("1700000000000")).toBe(1700000000000)
    expect(toTimestamp("2026-03-15T10:20:30.000Z")).toBe(Date.parse("2026-03-15T10:20:30.000Z"))
    expect(toTimestamp("not-a-date")).toBeNull()
    expect(toTimestamp(undefined)).toBeNull()
  })
})
