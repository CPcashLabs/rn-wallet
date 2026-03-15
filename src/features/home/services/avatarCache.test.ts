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
})
