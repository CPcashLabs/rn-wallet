function loadNativeFilePickerModule(input?: {
  os?: string
  nativeModule?: Record<string, unknown>
}) {
  jest.resetModules()
  jest.doMock("react-native", () => ({
    NativeModules: {
      CPCashFilePicker: input?.nativeModule,
    },
    Platform: {
      OS: input?.os ?? "ios",
    },
  }))

  return require("@/shared/native/nativeFilePickerModule") as typeof import("@/shared/native/nativeFilePickerModule")
}

describe("nativeFilePickerModule", () => {
  it("reports unsupported platforms and missing native modules", () => {
    expect(loadNativeFilePickerModule({ os: "web" }).readNativeFilePickerCapability()).toEqual({
      supported: false,
      reason: "File picking is only available on iOS and Android.",
    })

    expect(loadNativeFilePickerModule().readNativeFilePickerCapability()).toEqual({
      supported: false,
      reason: "File picker native module is not installed.",
    })
  })

  it("surfaces native capability flags and reason overrides", () => {
    expect(
      loadNativeFilePickerModule({
        nativeModule: {
          isSupported: false,
          reason: "No photo library permission",
        },
      }).readNativeFilePickerCapability(),
    ).toEqual({
      supported: false,
      reason: "No photo library permission",
    })

    expect(
      loadNativeFilePickerModule({
        nativeModule: {
          pickImage: jest.fn(),
          saveImage: jest.fn(),
          exportFile: jest.fn(),
          reason: "Device policy blocked file export",
        },
      }).readNativeFilePickerCapability(),
    ).toEqual({
      supported: false,
      reason: "Device policy blocked file export",
    })
  })

  it("falls back to the default unsupported file-picker reason", () => {
    expect(
      loadNativeFilePickerModule({
        nativeModule: {
          isSupported: false,
          pickImage: jest.fn(),
          saveImage: jest.fn(),
          exportFile: jest.fn(),
        },
      }).readNativeFilePickerCapability(),
    ).toEqual({
      supported: false,
      reason: "File picker is not supported on this device.",
    })
  })

  it("reports supported native modules without a reason override", () => {
    expect(
      loadNativeFilePickerModule({
        nativeModule: {
          pickImage: jest.fn(),
          saveImage: jest.fn(),
          exportFile: jest.fn(),
        },
      }).readNativeFilePickerCapability(),
    ).toEqual({
      supported: true,
    })
  })

  it("invokes native pick, save and export methods", async () => {
    const nativeModule = {
      pickImage: jest.fn(async () => ({ uri: "file:///tmp/image.png", name: "image.png", mimeType: "image/png" })),
      saveImage: jest.fn(async () => undefined),
      exportFile: jest.fn(async () => undefined),
    }
    const mod = loadNativeFilePickerModule({
      nativeModule,
    })

    await expect(mod.pickNativeImage()).resolves.toEqual({
      uri: "file:///tmp/image.png",
      name: "image.png",
      mimeType: "image/png",
    })
    await expect(mod.saveNativeImage("avatar.png", "ZmFrZQ==")).resolves.toBeUndefined()
    await expect(mod.exportNativeFile("note.txt", "SGVsbG8=", "text/plain")).resolves.toBeUndefined()

    expect(nativeModule.pickImage).toHaveBeenCalledTimes(1)
    expect(nativeModule.saveImage).toHaveBeenCalledWith("avatar.png", "ZmFrZQ==")
    expect(nativeModule.exportFile).toHaveBeenCalledWith("note.txt", "SGVsbG8=", "text/plain")
  })

  it("throws when required native file-picker methods are unavailable", async () => {
    const mod = loadNativeFilePickerModule()

    await expect(mod.pickNativeImage()).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "File picker native module is not installed.",
    })
    await expect(mod.saveNativeImage("avatar.png", "ZmFrZQ==")).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "File picker native module is not installed.",
    })
    await expect(mod.exportNativeFile("note.txt", "SGVsbG8=")).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "File picker native module is not installed.",
    })
  })

  it("reports remote-image cache support and delegates cache methods", async () => {
    const nativeModule = {
      pickImage: jest.fn(),
      saveImage: jest.fn(),
      exportFile: jest.fn(),
      cacheRemoteImage: jest.fn(async () => ({ localUri: "file:///tmp/cache.png" })),
      removeCachedImage: jest.fn(async () => undefined),
    }
    const mod = loadNativeFilePickerModule({
      nativeModule,
    })

    expect(mod.supportsNativeRemoteImageCache()).toBe(true)
    await expect(mod.cacheNativeRemoteImage("account-1", "https://example.com/avatar.png")).resolves.toEqual({
      localUri: "file:///tmp/cache.png",
    })
    await expect(mod.removeNativeCachedImage("file:///tmp/cache.png")).resolves.toBeUndefined()
    expect(nativeModule.cacheRemoteImage).toHaveBeenCalledWith("account-1", "https://example.com/avatar.png")
    expect(nativeModule.removeCachedImage).toHaveBeenCalledWith("file:///tmp/cache.png")
  })

  it("fails closed when native remote-image cache methods are missing", async () => {
    const mod = loadNativeFilePickerModule({
      nativeModule: {
        pickImage: jest.fn(),
        saveImage: jest.fn(),
        exportFile: jest.fn(),
      },
    })

    expect(mod.supportsNativeRemoteImageCache()).toBe(false)
    await expect(mod.cacheNativeRemoteImage("account-1", "https://example.com/avatar.png")).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "Native avatar file cache is not installed.",
    })
    await expect(mod.removeNativeCachedImage("file:///tmp/cache.png")).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "Native avatar file cache is not installed.",
    })
  })

  it("does not advertise remote-image cache support on unsupported platforms", () => {
    const mod = loadNativeFilePickerModule({
      os: "web",
      nativeModule: {
        cacheRemoteImage: jest.fn(),
        removeCachedImage: jest.fn(),
      },
    })

    expect(mod.supportsNativeRemoteImageCache()).toBe(false)
  })
})
