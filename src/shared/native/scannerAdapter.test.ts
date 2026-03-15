const mockReadNativeScannerCapability = jest.fn()
const mockScanWithNativeCamera = jest.fn()
const mockScanWithNativeImage = jest.fn()

jest.mock("@/shared/native/nativeScannerModule", () => ({
  readNativeScannerCapability: (...args: unknown[]) => mockReadNativeScannerCapability(...args),
  scanWithNativeCamera: (...args: unknown[]) => mockScanWithNativeCamera(...args),
  scanWithNativeImage: (...args: unknown[]) => mockScanWithNativeImage(...args),
}))

import { scannerAdapter } from "@/shared/native/scannerAdapter"

describe("scannerAdapter", () => {
  beforeEach(() => {
    mockReadNativeScannerCapability.mockReset()
    mockScanWithNativeCamera.mockReset()
    mockScanWithNativeImage.mockReset()
  })

  it("reports native capability", () => {
    mockReadNativeScannerCapability.mockReturnValue({
      supported: true,
    })

    expect(scannerAdapter.getCapability()).toEqual({
      supported: true,
    })
  })

  it("returns unavailable results when scanning is unsupported", async () => {
    mockReadNativeScannerCapability.mockReturnValue({
      supported: false,
      reason: "Unavailable",
    })

    await expect(scannerAdapter.scan()).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
        message: "scanner is not available in the current app version",
      },
    })
    await expect(scannerAdapter.scanImage()).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
      },
    })
  })

  it("delegates successful scan calls", async () => {
    mockReadNativeScannerCapability.mockImplementation((mode?: string) => ({
      supported: mode !== "image",
      reason: mode === "image" ? "Image scan unavailable" : undefined,
    }))
    mockScanWithNativeCamera.mockResolvedValue({
      value: "camera-result",
    })

    await expect(scannerAdapter.scan()).resolves.toEqual({
      ok: true,
      data: {
        value: "camera-result",
      },
    })
  })

  it("normalizes native scan errors", async () => {
    mockReadNativeScannerCapability.mockReturnValue({
      supported: true,
    })
    mockScanWithNativeImage.mockRejectedValue({
      code: "SCAN_FAILED",
      message: "Camera busy",
    })

    const result = await scannerAdapter.scanImage()

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("Expected scanImage to fail")
    }

    expect(result.error).toMatchObject({
      message: "Camera busy",
      code: "SCAN_FAILED",
    })
  })
})
