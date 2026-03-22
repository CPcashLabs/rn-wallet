const mockShare = jest.fn()
const mockReadFileSystemCapability = jest.fn()
const mockWriteTemporaryFile = jest.fn()
const mockRemoveTemporaryFile = jest.fn()

jest.mock("react-native", () => ({
  Share: {
    share: (...args: unknown[]) => mockShare(...args),
  },
}))

jest.mock("@/shared/native/fileSystemStorage", () => ({
  readFileSystemCapability: (...args: unknown[]) => mockReadFileSystemCapability(...args),
  writeTemporaryFile: (...args: unknown[]) => mockWriteTemporaryFile(...args),
  removeTemporaryFile: (...args: unknown[]) => mockRemoveTemporaryFile(...args),
}))

import { shareAdapter } from "@/shared/native/shareAdapter"

describe("shareAdapter", () => {
  beforeEach(() => {
    mockShare.mockReset()
    mockReadFileSystemCapability.mockReset()
    mockWriteTemporaryFile.mockReset()
    mockRemoveTemporaryFile.mockReset()
    mockReadFileSystemCapability.mockReturnValue({ supported: true })
    mockWriteTemporaryFile.mockResolvedValue("file:///tmp/share.png")
    mockRemoveTemporaryFile.mockResolvedValue(undefined)
  })

  it("always reports share capability as supported", () => {
    expect(shareAdapter.getCapability()).toEqual({
      supported: true,
    })
  })

  it("shares messages with optional urls", async () => {
    mockShare.mockResolvedValue(undefined)

    await expect(
      shareAdapter.share({
        title: "Invite",
        message: "Join CPCash",
        url: "https://cp.cash/invite",
      }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    })

    expect(mockShare).toHaveBeenCalledWith({
      title: "Invite",
      message: "Join CPCash\nhttps://cp.cash/invite",
      url: "https://cp.cash/invite",
    })
  })

  it("shares plain messages when no url is provided", async () => {
    mockShare.mockResolvedValue(undefined)

    await expect(
      shareAdapter.share({
        message: "Join CPCash",
      }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    })

    expect(mockShare).toHaveBeenCalledWith({
      title: undefined,
      message: "Join CPCash",
      url: undefined,
    })
  })

  it("writes temporary images before opening the native share sheet", async () => {
    mockShare.mockResolvedValue(undefined)

    await expect(
      shareAdapter.share({
        title: "Receive",
        image: {
          filename: "receive-qr.png",
          base64: "ZmFrZQ==",
          mimeType: "image/png",
        },
      }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    })

    expect(mockWriteTemporaryFile).toHaveBeenCalledWith({
      directoryName: "share",
      filename: "receive-qr.png",
      mimeType: "image/png",
      fallbackBaseName: "shared-image",
      fallbackExtension: "png",
      content: "ZmFrZQ==",
      encoding: "base64",
    })
    expect(mockShare).toHaveBeenCalledWith({
      title: "Receive",
      message: undefined,
      url: "file:///tmp/share.png",
    })
    expect(mockRemoveTemporaryFile).toHaveBeenCalledWith("file:///tmp/share.png")
  })

  it("returns unavailable results when image sharing is unsupported", async () => {
    mockReadFileSystemCapability.mockReturnValue({
      supported: false,
      reason: "Unavailable",
    })

    await expect(
      shareAdapter.share({
        image: {
          filename: "receive-qr.png",
          base64: "ZmFrZQ==",
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        name: "NativeCapabilityUnavailableError",
        message: "Unavailable",
      },
    })
  })

  it("normalizes native share failures", async () => {
    mockShare.mockRejectedValue("failed")

    const result = await shareAdapter.share({
      message: "Join CPCash",
    })

    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error("Expected share to fail")
    }

    expect(result.error).toMatchObject({
      message: "Native share failed",
    })
  })

  it("preserves native Error instances", async () => {
    mockShare.mockRejectedValue(new Error("Share sheet unavailable"))

    const result = await shareAdapter.share({
      message: "Join CPCash",
    })

    expect(result).toMatchObject({
      ok: false,
      error: {
        message: "Share sheet unavailable",
      },
    })
  })
})
