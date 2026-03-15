const mockStorageMap = new Map<string, unknown>()
const mockRemoveNetworkLogoFile = jest.fn(async (_localUri?: string | null) => undefined)

jest.mock("@/shared/storage/kvStorage", () => ({
  getJson: jest.fn((key: string) => mockStorageMap.get(key) ?? null),
  setJson: jest.fn((key: string, value: unknown) => {
    mockStorageMap.set(key, value)
  }),
  removeItem: jest.fn((key: string) => {
    mockStorageMap.delete(key)
  }),
}))

jest.mock("@/shared/ui/networkLogoFileCache", () => ({
  removeNetworkLogoFile: (localUri?: string | null) => mockRemoveNetworkLogoFile(localUri),
}))

import {
  buildNetworkLogoCacheKey,
  readCachedNetworkLogoEntry,
  removeCachedNetworkLogoEntry,
  writeCachedNetworkLogoEntry,
} from "@/shared/ui/networkLogoCache"

describe("networkLogoCache", () => {
  beforeEach(() => {
    mockStorageMap.clear()
    mockRemoveNetworkLogoFile.mockClear()
  })

  it("removes the previous local file when the same logo key resolves to a new file", async () => {
    const logoKey = buildNetworkLogoCacheKey({
      chainName: "TRON",
      fallbackMode: "initials",
    })

    await writeCachedNetworkLogoEntry({
      logoKey,
      remoteUri: "https://cp.cash/logo-1.png",
      localUri: "file:///logo-1.png",
    })
    await writeCachedNetworkLogoEntry({
      logoKey,
      remoteUri: "https://cp.cash/logo-2.png",
      localUri: "file:///logo-2.png",
    })

    expect(readCachedNetworkLogoEntry(logoKey)).toMatchObject({
      remoteUri: "https://cp.cash/logo-2.png",
      localUri: "file:///logo-2.png",
    })
    expect(mockRemoveNetworkLogoFile).toHaveBeenCalledWith("file:///logo-1.png")
  })

  it("removes the cached local file when deleting a network logo entry", async () => {
    const logoKey = buildNetworkLogoCacheKey({
      chainName: "TRON",
      fallbackMode: "initials",
    })

    await writeCachedNetworkLogoEntry({
      logoKey,
      remoteUri: "https://cp.cash/logo.png",
      localUri: "file:///logo.png",
    })

    await removeCachedNetworkLogoEntry(logoKey)

    expect(readCachedNetworkLogoEntry(logoKey)).toBeNull()
    expect(mockRemoveNetworkLogoFile).toHaveBeenCalledWith("file:///logo.png")
  })
})
