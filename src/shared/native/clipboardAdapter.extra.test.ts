function loadClipboardAdapter(moduleShape: Record<string, unknown>) {
  jest.resetModules()
  jest.doMock("@react-native-clipboard/clipboard", () => ({
    __esModule: true,
    ...moduleShape,
  }))

  return require("@/shared/native/clipboardAdapter") as typeof import("@/shared/native/clipboardAdapter")
}

describe("clipboardAdapter extra coverage", () => {
  it("reports clipboard support and falls back to the named setString export", async () => {
    const setString = jest.fn()
    const { clipboardAdapter } = loadClipboardAdapter({
      setString,
    })

    expect(clipboardAdapter.getCapability()).toEqual({
      supported: true,
    })
    await expect(clipboardAdapter.setString("hello")).resolves.toEqual({
      ok: true,
      data: undefined,
    })
    expect(setString).toHaveBeenCalledWith("hello")
  })

  it("returns the native-module-unavailable error when clipboard exports are missing", async () => {
    const { clipboardAdapter } = loadClipboardAdapter({})

    await expect(clipboardAdapter.setString("hello")).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Clipboard module is not available",
      },
    })
  })
})
