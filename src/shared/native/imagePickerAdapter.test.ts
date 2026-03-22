const mockLaunchImageLibrary = jest.fn()
const mockGetSize = jest.fn()
const mockReadFileSystemCapability = jest.fn()
const mockCopyToTemporaryFile = jest.fn()
const mockResolveMimeTypeFromFilename = jest.fn()

jest.mock("react-native-image-picker", () => ({
  launchImageLibrary: (...args: unknown[]) => mockLaunchImageLibrary(...args),
}))

jest.mock("react-native", () => ({
  Image: {
    getSize: (...args: unknown[]) => mockGetSize(...args),
  },
  Platform: {
    OS: "ios",
  },
}))

jest.mock("@/shared/native/fileSystemStorage", () => ({
  copyToTemporaryFile: (...args: unknown[]) => mockCopyToTemporaryFile(...args),
  ensureFileUri: (uri: string) => (uri.startsWith("/") ? `file://${uri}` : uri),
  readFileSystemCapability: (...args: unknown[]) => mockReadFileSystemCapability(...args),
  resolveMimeTypeFromFilename: (...args: unknown[]) => mockResolveMimeTypeFromFilename(...args),
}))

import { imagePickerAdapter, isImagePickerCancelledError } from "@/shared/native/imagePickerAdapter"

describe("imagePickerAdapter", () => {
  beforeEach(() => {
    mockLaunchImageLibrary.mockReset()
    mockGetSize.mockReset()
    mockReadFileSystemCapability.mockReset()
    mockCopyToTemporaryFile.mockReset()
    mockResolveMimeTypeFromFilename.mockReset()
    mockReadFileSystemCapability.mockReturnValue({ supported: true })
    mockResolveMimeTypeFromFilename.mockReturnValue("image/jpeg")
  })

  it("reports capability failures from the file system layer", async () => {
    mockReadFileSystemCapability.mockReturnValue({
      supported: false,
      reason: "Unavailable",
    })

    expect(imagePickerAdapter.getCapability()).toEqual({
      supported: false,
      reason: "Unavailable",
    })

    await expect(imagePickerAdapter.pickImage()).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
        message: "Unavailable",
      },
    })
  })

  it("normalizes user cancellation", async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      didCancel: true,
    })

    const result = await imagePickerAdapter.pickImage()
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("Expected pickImage to be cancelled")
    }

    expect(isImagePickerCancelledError(result.error)).toBe(true)
    expect(result.error).toMatchObject({
      name: "ImagePickerCancelledError",
      code: "cancelled",
    })
  })

  it("returns picked file assets without copying when a local file uri is available", async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [{
        uri: "file:///tmp/avatar.jpg",
        fileName: "avatar.jpg",
        type: "image/jpeg",
        width: 320,
        height: 240,
        fileSize: 1234,
      }],
    })

    await expect(imagePickerAdapter.pickImage()).resolves.toEqual({
      ok: true,
      data: {
        uri: "file:///tmp/avatar.jpg",
        name: "avatar.jpg",
        mimeType: "image/jpeg",
        width: 320,
        height: 240,
        fileSize: 1234,
      },
    })
    expect(mockCopyToTemporaryFile).not.toHaveBeenCalled()
  })

  it("copies non-file assets into cache and falls back to Image.getSize", async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [{
        uri: "content://picked/image",
        fileName: "avatar.png",
        type: "",
      }],
    })
    mockCopyToTemporaryFile.mockResolvedValue("file:///tmp/copied-avatar.png")
    mockGetSize.mockImplementation((_: string, onSuccess: (width: number, height: number) => void) => {
      onSuccess(640, 480)
    })
    mockResolveMimeTypeFromFilename.mockReturnValue("image/png")

    await expect(imagePickerAdapter.pickImage()).resolves.toEqual({
      ok: true,
      data: {
        uri: "file:///tmp/copied-avatar.png",
        name: "avatar.png",
        mimeType: "image/png",
        width: 640,
        height: 480,
        fileSize: undefined,
      },
    })

    expect(mockCopyToTemporaryFile).toHaveBeenCalledWith({
      sourceUri: "content://picked/image",
      directoryName: "picked-images",
      filename: "avatar.png",
      mimeType: "image/png",
      fallbackBaseName: "picked-image",
      fallbackExtension: "jpg",
    })
  })
})
