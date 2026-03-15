const mockSetString = jest.fn()

jest.mock("@react-native-clipboard/clipboard", () => ({
  __esModule: true,
  setString: mockSetString,
  default: {
    setString: mockSetString,
  },
}))

import { clipboardAdapter } from "@/shared/native/clipboardAdapter"

describe("clipboardAdapter", () => {
  beforeEach(() => {
    mockSetString.mockReset()
  })

  it("writes text through the official clipboard module", async () => {
    const result = await clipboardAdapter.setString("hello")

    expect(mockSetString).toHaveBeenCalledWith("hello")
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it("returns an error result when clipboard write throws", async () => {
    mockSetString.mockImplementation(() => {
      throw new Error("boom")
    })

    const result = await clipboardAdapter.setString("hello")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe("boom")
    }
  })
})
