const mockGetCurrentLanguage = jest.fn()

jest.mock("@/shared/i18n", () => ({
  getCurrentLanguage: () => mockGetCurrentLanguage(),
}))

import { resolveAcceptLanguage } from "@/shared/api/language-header"

describe("resolveAcceptLanguage", () => {
  it("delegates to the current i18n language", () => {
    mockGetCurrentLanguage.mockReturnValue("zh-CN")

    expect(resolveAcceptLanguage()).toBe("zh-CN")
  })
})
