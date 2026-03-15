const mockShare = jest.fn()

jest.mock("react-native", () => ({
  Share: {
    share: (...args: unknown[]) => mockShare(...args),
  },
}))

import { shareAdapter } from "@/shared/native/shareAdapter"

describe("shareAdapter", () => {
  beforeEach(() => {
    mockShare.mockReset()
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
