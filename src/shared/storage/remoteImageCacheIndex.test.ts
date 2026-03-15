import {
  pruneRemoteImageCacheEntries,
  removeRemoteImageCacheEntry,
  upsertRemoteImageCacheEntry,
} from "@/shared/storage/remoteImageCacheIndex"

describe("remoteImageCacheIndex", () => {
  it("prunes oldest entries and returns evicted local uris", () => {
    const result = pruneRemoteImageCacheEntries(
      {
        newest: { localUri: "file:///newest", updatedAt: 3 },
        middle: { localUri: "file:///middle", updatedAt: 2 },
        oldest: { localUri: "file:///oldest", updatedAt: 1 },
      },
      2,
    )

    expect(result.nextCacheMap).toEqual({
      newest: { localUri: "file:///newest", updatedAt: 3 },
      middle: { localUri: "file:///middle", updatedAt: 2 },
    })
    expect(result.removedLocalUris).toEqual(["file:///oldest"])
  })

  it("returns the replaced local uri when an entry points to a new file", () => {
    const result = upsertRemoteImageCacheEntry(
      {
        avatar: { localUri: "file:///old", updatedAt: 1 },
      },
      "avatar",
      { localUri: "file:///new", updatedAt: 2 },
      4,
    )

    expect(result.nextCacheMap.avatar).toEqual({
      localUri: "file:///new",
      updatedAt: 2,
    })
    expect(result.removedLocalUris).toEqual(["file:///old"])
  })

  it("removes the local uri when deleting an entry", () => {
    const result = removeRemoteImageCacheEntry(
      {
        avatar: { localUri: "file:///avatar", updatedAt: 1 },
      },
      "avatar",
    )

    expect(result.nextCacheMap).toEqual({})
    expect(result.removedLocalUris).toEqual(["file:///avatar"])
  })

  it("ignores missing local uris when pruning or removing entries", () => {
    expect(
      pruneRemoteImageCacheEntries(
        {
          newest: { updatedAt: 2 },
          oldest: { updatedAt: 1 },
        },
        1,
      ),
    ).toEqual({
      nextCacheMap: {
        newest: { updatedAt: 2 },
      },
      removedLocalUris: [],
    })

    expect(
      removeRemoteImageCacheEntry(
        {
          avatar: { updatedAt: 1 },
        },
        "avatar",
      ),
    ).toEqual({
      nextCacheMap: {},
      removedLocalUris: [],
    })
  })
})
