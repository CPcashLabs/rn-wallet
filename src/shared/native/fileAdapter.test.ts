const mockReadNativeFilePickerCapability = jest.fn()
const mockPickNativeImage = jest.fn()
const mockExportNativeFile = jest.fn()
const mockSaveNativeImage = jest.fn()

jest.mock("@/shared/native/nativeFilePickerModule", () => ({
  readNativeFilePickerCapability: (...args: unknown[]) => mockReadNativeFilePickerCapability(...args),
  pickNativeImage: (...args: unknown[]) => mockPickNativeImage(...args),
  exportNativeFile: (...args: unknown[]) => mockExportNativeFile(...args),
  saveNativeImage: (...args: unknown[]) => mockSaveNativeImage(...args),
}))

import { fileAdapter, isNativeImagePickerCancelledError } from "@/shared/native/fileAdapter"

describe("fileAdapter", () => {
  beforeEach(() => {
    mockReadNativeFilePickerCapability.mockReset()
    mockPickNativeImage.mockReset()
    mockExportNativeFile.mockReset()
    mockSaveNativeImage.mockReset()
  })

  it("reports native capability and blocks unsupported operations", async () => {
    mockReadNativeFilePickerCapability.mockReturnValue({
      supported: false,
      reason: "Unavailable",
    })

    expect(fileAdapter.getCapability()).toEqual({
      supported: false,
      reason: "Unavailable",
    })
    await expect(fileAdapter.pickImage()).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
        message: "Unavailable",
      },
    })
  })

  it("picks images and exports utf8 or base64 content", async () => {
    mockReadNativeFilePickerCapability.mockReturnValue({
      supported: true,
    })
    mockPickNativeImage.mockResolvedValue({
      uri: "file:///tmp/photo.png",
      name: "photo.png",
      mimeType: "image/png",
    })
    mockExportNativeFile.mockResolvedValue(undefined)

    await expect(fileAdapter.pickImage()).resolves.toEqual({
      ok: true,
      data: {
        uri: "file:///tmp/photo.png",
        name: "photo.png",
        mimeType: "image/png",
      },
    })

    await expect(
      fileAdapter.exportFile({
        filename: "hello.txt",
        content: "Hello",
        mimeType: "text/plain",
      }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    })
    await expect(
      fileAdapter.exportFile({
        filename: "image.png",
        content: "ZmFrZQ==",
        encoding: "base64",
      }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    })

    expect(mockExportNativeFile).toHaveBeenNthCalledWith(1, "hello.txt", "SGVsbG8=", "text/plain")
    expect(mockExportNativeFile).toHaveBeenNthCalledWith(2, "image.png", "ZmFrZQ==", undefined)
  })

  it("returns unavailable errors for export and save when file access is disabled", async () => {
    mockReadNativeFilePickerCapability.mockReturnValue({
      supported: false,
      reason: "No permission",
    })

    await expect(
      fileAdapter.exportFile({
        filename: "note.txt",
        content: "hello",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
        message: "No permission",
      },
    })
    await expect(
      fileAdapter.saveImage({
        filename: "note.png",
        base64: "ZmFrZQ==",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
        message: "No permission",
      },
    })
  })

  it("normalizes export failures and returns save success", async () => {
    mockReadNativeFilePickerCapability.mockReturnValue({
      supported: true,
    })
    mockExportNativeFile.mockRejectedValue({
      message: "Disk full",
      code: "disk_full",
    })
    mockSaveNativeImage.mockResolvedValue(undefined)

    await expect(
      fileAdapter.exportFile({
        filename: "note.txt",
        content: "hello",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Disk full",
        code: "disk_full",
      },
    })
    await expect(
      fileAdapter.saveImage({
        filename: "note.png",
        base64: "ZmFrZQ==",
      }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    })
  })

  it("saves images and normalizes native picker errors", async () => {
    mockReadNativeFilePickerCapability.mockReturnValue({
      supported: true,
    })
    mockSaveNativeImage.mockRejectedValue({
      message: "User cancelled image selection.",
      code: "cancelled",
    })

    const result = await fileAdapter.saveImage({
      filename: "avatar.png",
      base64: "ZmFrZQ==",
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("Expected saveImage to fail")
    }

    expect(result.error).toMatchObject({
      name: "NativeImagePickerCancelledError",
      message: "User cancelled image selection.",
      code: "cancelled",
    })
  })

  it("preserves Error instances from the picker and uses a generic fallback for non-object failures", async () => {
    mockReadNativeFilePickerCapability.mockReturnValue({
      supported: true,
    })
    mockPickNativeImage.mockRejectedValueOnce(new Error("Picker closed unexpectedly"))
    mockExportNativeFile.mockRejectedValueOnce("failed")

    await expect(fileAdapter.pickImage()).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Picker closed unexpectedly",
      },
    })
    await expect(
      fileAdapter.exportFile({
        filename: "note.txt",
        content: "hello",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "Image picking failed",
      },
    })
  })

  it("keeps the generic picker message when native payload fields are blank or non-string", async () => {
    mockReadNativeFilePickerCapability.mockReturnValue({
      supported: true,
    })
    mockPickNativeImage.mockRejectedValue({
      message: "   ",
      code: 123,
    })

    const result = await fileAdapter.pickImage()

    expect(result).toMatchObject({
      ok: false,
      error: {
        message: "Image picking failed",
      },
    })
    if (!result.ok) {
      expect("code" in result.error).toBe(false)
    }
  })

  it("detects image-picker cancellation errors by name, code and message", () => {
    expect(
      isNativeImagePickerCancelledError(
        Object.assign(new Error("ignored"), {
          name: "NativeImagePickerCancelledError",
        }),
      ),
    ).toBe(true)
    expect(
      isNativeImagePickerCancelledError(
        Object.assign(new Error("ignored"), {
          code: "cancelled",
        }),
      ),
    ).toBe(true)
    expect(isNativeImagePickerCancelledError(new Error("User cancelled image selection."))).toBe(true)
    expect(isNativeImagePickerCancelledError(new Error("other"))).toBe(false)
    expect(isNativeImagePickerCancelledError("other")).toBe(false)
  })
})
