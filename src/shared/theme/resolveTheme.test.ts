import { resolveTheme } from "@/shared/theme/resolveTheme"
import { darkThemeTokens, lightThemeTokens } from "@/shared/theme/tokens"

describe("resolveTheme", () => {
  it("always uses the explicit dark theme", () => {
    expect(resolveTheme("dark", "light")).toBe(darkThemeTokens)
    expect(resolveTheme("dark", null)).toBe(darkThemeTokens)
  })

  it("always uses the explicit light theme", () => {
    expect(resolveTheme("light", "dark")).toBe(lightThemeTokens)
    expect(resolveTheme("light", null)).toBe(lightThemeTokens)
  })

  it("falls back to the system scheme in system mode", () => {
    expect(resolveTheme("system", "dark")).toBe(darkThemeTokens)
    expect(resolveTheme("system", "light")).toBe(lightThemeTokens)
    expect(resolveTheme("system", null)).toBe(lightThemeTokens)
  })
})
