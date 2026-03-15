function loadNativeScannerModule(input?: {
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

  return require("@/shared/native/nativeScannerModule") as typeof import("@/shared/native/nativeScannerModule")
}

describe("nativeScannerModule", () => {
  it("reports unsupported platforms and missing native modules", () => {
    expect(loadNativeScannerModule({ os: "web" }).readNativeScannerCapability()).toEqual({
      supported: false,
      reason: "Scanning is only available on iOS and Android.",
    })

    expect(loadNativeScannerModule().readNativeScannerCapability()).toEqual({
      supported: false,
      reason: "Scanner native module is not installed.",
    })
  })

  it("uses native capability flags for both camera and image modes", () => {
    const mod = loadNativeScannerModule({
      nativeModule: {
        scannerCameraSupported: false,
        scannerImageSupported: undefined,
        scannerReason: "Camera permission denied",
      },
    })

    expect(mod.readNativeScannerCapability("camera")).toEqual({
      supported: false,
      reason: "Camera permission denied",
    })
    expect(mod.readNativeScannerCapability("image")).toEqual({
      supported: false,
      reason: "Camera permission denied",
    })
  })

  it("falls back to default scanner reasons when the native module omits them", () => {
    const unsupported = loadNativeScannerModule({
      nativeModule: {
        scannerCameraSupported: false,
      },
    })
    const unavailable = loadNativeScannerModule({
      nativeModule: {
        scannerCameraSupported: true,
        scannerImageSupported: undefined,
      },
    })

    expect(unsupported.readNativeScannerCapability("camera")).toEqual({
      supported: false,
      reason: "Scanner is not supported on this device.",
    })
    expect(unavailable.readNativeScannerCapability("image")).toEqual({
      supported: false,
      reason: "Scanner capability is unavailable.",
    })
  })

  it("delegates native scan calls when support is available", async () => {
    const nativeModule = {
      scannerCameraSupported: true,
      scannerImageSupported: true,
      scan: jest.fn(async () => ({ value: "camera-result" })),
      scanImage: jest.fn(async () => ({ value: "image-result" })),
    }
    const mod = loadNativeScannerModule({
      nativeModule,
    })

    expect(mod.readNativeScannerCapability("camera")).toEqual({ supported: true })
    expect(mod.readNativeScannerCapability("image")).toEqual({ supported: true })
    await expect(mod.scanWithNativeCamera()).resolves.toEqual({ value: "camera-result" })
    await expect(mod.scanWithNativeImage()).resolves.toEqual({ value: "image-result" })
  })

  it("throws when native scanning is unavailable", async () => {
    const mod = loadNativeScannerModule({
      nativeModule: {
        scannerCameraSupported: false,
        scannerReason: "Scanner unavailable",
      },
    })

    await expect(mod.scanWithNativeCamera()).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "Scanner unavailable",
    })
    await expect(mod.scanWithNativeImage()).rejects.toMatchObject({
      name: "NativeCapabilityUnavailableError",
      message: "Scanner unavailable",
    })
  })
})
