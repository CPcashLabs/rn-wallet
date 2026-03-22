const mockRequestPermissionsAsync = jest.fn()
const mockSaveToLibraryAsync = jest.fn()
const mockReadFileSystemCapability = jest.fn()
const mockWriteTemporaryFile = jest.fn()
const mockRemoveTemporaryFile = jest.fn()

jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  saveToLibraryAsync: (...args: unknown[]) => mockSaveToLibraryAsync(...args),
}))

jest.mock("@/shared/native/fileSystemStorage", () => ({
  readFileSystemCapability: (...args: unknown[]) => mockReadFileSystemCapability(...args),
  writeTemporaryFile: (...args: unknown[]) => mockWriteTemporaryFile(...args),
  removeTemporaryFile: (...args: unknown[]) => mockRemoveTemporaryFile(...args),
}))

import { mediaLibraryAdapter } from "@/shared/native/mediaLibraryAdapter"

describe("mediaLibraryAdapter", () => {
  beforeEach(() => {
    mockRequestPermissionsAsync.mockReset()
    mockSaveToLibraryAsync.mockReset()
    mockReadFileSystemCapability.mockReset()
    mockWriteTemporaryFile.mockReset()
    mockRemoveTemporaryFile.mockReset()
    mockReadFileSystemCapability.mockReturnValue({ supported: true })
    mockWriteTemporaryFile.mockResolvedValue("file:///tmp/qr.png")
    mockRemoveTemporaryFile.mockResolvedValue(undefined)
  })

  it("blocks unsupported capability", async () => {
    mockReadFileSystemCapability.mockReturnValue({
      supported: false,
      reason: "Unavailable",
    })

    await expect(
      mediaLibraryAdapter.saveImage({
        filename: "qr.png",
        base64: "ZmFrZQ==",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
        message: "Unavailable",
      },
    })
  })

  it("returns permission errors when media-library access is denied", async () => {
    mockRequestPermissionsAsync.mockResolvedValue({
      granted: false,
    })

    await expect(
      mediaLibraryAdapter.saveImage({
        filename: "qr.png",
        base64: "ZmFrZQ==",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Photo library permission was denied.",
      },
    })
  })

  it("writes a temporary file, saves it, and cleans up", async () => {
    mockRequestPermissionsAsync.mockResolvedValue({
      granted: true,
    })
    mockSaveToLibraryAsync.mockResolvedValue(undefined)

    await expect(
      mediaLibraryAdapter.saveImage({
        filename: "qr.png",
        base64: "ZmFrZQ==",
        mimeType: "image/png",
      }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    })

    expect(mockWriteTemporaryFile).toHaveBeenCalledWith({
      directoryName: "media-library",
      filename: "qr.png",
      mimeType: "image/png",
      fallbackBaseName: "saved-image",
      fallbackExtension: "png",
      content: "ZmFrZQ==",
      encoding: "base64",
    })
    expect(mockSaveToLibraryAsync).toHaveBeenCalledWith("file:///tmp/qr.png")
    expect(mockRemoveTemporaryFile).toHaveBeenCalledWith("file:///tmp/qr.png")
  })
})
