const mockSetString = jest.fn()

jest.mock("@react-native-clipboard/clipboard", () => ({
  __esModule: true,
  setString: mockSetString,
  default: {
    setString: mockSetString,
  },
}))

import { clipboardAdapter } from "@/shared/native/clipboardAdapter"

function loadClipboardAdapterWithModule(moduleExports: Record<string, unknown>) {
  jest.resetModules()
  jest.doMock("@react-native-clipboard/clipboard", () => moduleExports)
  return require("@/shared/native/clipboardAdapter") as typeof import("@/shared/native/clipboardAdapter")
}

describe("clipboardAdapter", () => {
  beforeEach(() => {
    mockSetString.mockReset()
  })

  it("reports clipboard capability as supported", () => {
    expect(clipboardAdapter.getCapability()).toEqual({
      supported: true,
    })
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

  it("normalizes non-error clipboard failures", async () => {
    mockSetString.mockImplementation(() => {
      throw "boom"
    })

    await expect(clipboardAdapter.setString("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Clipboard write failed",
      },
    })
  })

  it("falls back to the named clipboard export when the default export is unavailable", async () => {
    const namedSetString = jest.fn()
    const { clipboardAdapter: namedClipboardAdapter } = loadClipboardAdapterWithModule({
      __esModule: true,
      setString: namedSetString,
    })

    await expect(namedClipboardAdapter.setString("hello")).resolves.toEqual({
      ok: true,
      data: undefined,
    })
    expect(namedSetString).toHaveBeenCalledWith("hello")
  })

  it("fails closed when the clipboard module exposes neither a default nor named writer", async () => {
    const { clipboardAdapter: missingClipboardAdapter } = loadClipboardAdapterWithModule({
      __esModule: true,
    })

    await expect(missingClipboardAdapter.setString("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Clipboard module is not available",
      },
    })
  })
})
