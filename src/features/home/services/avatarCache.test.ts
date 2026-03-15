const mockStorageMap = new Map<string, unknown>()
const mockRemoveAvatarFile = jest.fn(async (_localUri?: string | null) => undefined)

jest.mock("@/shared/storage/kvStorage", () => ({
  getJson: jest.fn((key: string) => mockStorageMap.get(key) ?? null),
  setJson: jest.fn((key: string, value: unknown) => {
    mockStorageMap.set(key, value)
  }),
  removeItem: jest.fn((key: string) => {
    mockStorageMap.delete(key)
  }),
}))

jest.mock("@/features/home/services/avatarFileCache", () => ({
  removeAvatarFile: (localUri?: string | null) => mockRemoveAvatarFile(localUri),
}))

import { writeCachedAvatarEntry, removeCachedAvatarEntry, readCachedAvatarEntry } from "@/features/home/services/avatarCache"

describe("avatarCache", () => {
  beforeEach(() => {
    mockStorageMap.clear()
    mockRemoveAvatarFile.mockClear()
  })

  it("removes the previous local file when rewriting the same account cache entry", async () => {
    await writeCachedAvatarEntry({
      accountKey: "0xabc",
      remoteUri: "https://cp.cash/avatar-1.png",
      localUri: "file:///avatar-1.png",
    })
    await writeCachedAvatarEntry({
      accountKey: "0xabc",
      remoteUri: "https://cp.cash/avatar-2.png",
      localUri: "file:///avatar-2.png",
    })

    expect(readCachedAvatarEntry("0xabc")).toMatchObject({
      remoteUri: "https://cp.cash/avatar-2.png",
      localUri: "file:///avatar-2.png",
    })
    expect(mockRemoveAvatarFile).toHaveBeenCalledWith("file:///avatar-1.png")
  })

  it("removes the cached local file when deleting an avatar entry", async () => {
    await writeCachedAvatarEntry({
      accountKey: "0xabc",
      remoteUri: "https://cp.cash/avatar.png",
      localUri: "file:///avatar.png",
    })

    await removeCachedAvatarEntry("0xabc")

    expect(readCachedAvatarEntry("0xabc")).toBeNull()
    expect(mockRemoveAvatarFile).toHaveBeenCalledWith("file:///avatar.png")
  })

  it("normalizes account keys and ignores incomplete entries", async () => {
    await writeCachedAvatarEntry({
      accountKey: "  0xAbC  ",
      remoteUri: "   ",
      localUri: "file:///avatar.png",
    })

    expect(readCachedAvatarEntry("0xabc")).toBeNull()

    await removeCachedAvatarEntry("")
    expect(mockRemoveAvatarFile).not.toHaveBeenCalled()
  })

  it("returns null for blank reads and ignores removing a missing cache entry", async () => {
    expect(readCachedAvatarEntry("   ")).toBeNull()

    await writeCachedAvatarEntry({
      accountKey: "0xabc",
      remoteUri: "https://cp.cash/avatar.png",
      localUri: "file:///avatar.png",
    })

    await removeCachedAvatarEntry("0xdef")

    expect(readCachedAvatarEntry("0xabc")).toMatchObject({
      remoteUri: "https://cp.cash/avatar.png",
    })
    expect(mockRemoveAvatarFile).not.toHaveBeenCalled()
  })

  it("normalizes malformed stored entries and falls back through legacy avatar uri fields", () => {
    mockStorageMap.set("auth.user_avatar_cache", {
      "0xabc": {
        accountKey: "0xabc",
        remoteUri: " https://cp.cash/avatar.png ",
        localUri: " file:///avatar.png ",
        resolvedUri: "",
        avatarUri: "https://cp.cash/legacy.png",
        updatedAt: "bad",
      },
      "0xdef": {
        accountKey: "0xdef",
        remoteUri: "",
        localUri: "file:///avatar-2.png",
        resolvedUri: "",
        avatarUri: "https://cp.cash/legacy-2.png",
        updatedAt: 2,
      },
    })

    expect(readCachedAvatarEntry("0xabc")).toEqual({
      accountKey: "0xabc",
      remoteUri: "https://cp.cash/avatar.png",
      localUri: "file:///avatar.png",
      fallbackRemoteUri: "https://cp.cash/avatar.png",
      updatedAt: 0,
    })
    expect(readCachedAvatarEntry("0xdef")).toEqual({
      accountKey: "0xdef",
      remoteUri: "",
      localUri: "file:///avatar-2.png",
      fallbackRemoteUri: "https://cp.cash/legacy-2.png",
      updatedAt: 2,
    })
  })
})
