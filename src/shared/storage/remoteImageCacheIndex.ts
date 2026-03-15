type IndexedLocalUriEntry = {
  localUri?: string | null
  updatedAt: number
}

type CacheIndexMutationResult<T extends IndexedLocalUriEntry> = {
  nextCacheMap: Record<string, T>
  removedLocalUris: string[]
}

function normalizeLocalUri(localUri?: string | null) {
  return localUri?.trim() || ""
}

function collectRetainedLocalUris<T extends IndexedLocalUriEntry>(cacheMap: Record<string, T>) {
  return new Set(
    Object.values(cacheMap)
      .map(entry => normalizeLocalUri(entry.localUri))
      .filter(Boolean),
  )
}

function dedupeRemovedLocalUris(candidateUris: string[], retainedLocalUris: Set<string>) {
  const removed = new Set<string>()

  for (const candidateUri of candidateUris) {
    const normalized = normalizeLocalUri(candidateUri)
    if (!normalized || retainedLocalUris.has(normalized)) {
      continue
    }

    removed.add(normalized)
  }

  return [...removed]
}

export function pruneRemoteImageCacheEntries<T extends IndexedLocalUriEntry>(
  cacheMap: Record<string, T>,
  maxEntries: number,
): CacheIndexMutationResult<T> {
  const entries = Object.entries(cacheMap)
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
    .slice(0, maxEntries)
  const nextCacheMap = Object.fromEntries(entries) as Record<string, T>
  const retainedKeys = new Set(Object.keys(nextCacheMap))
  const removedCandidates = Object.entries(cacheMap)
    .filter(([key]) => !retainedKeys.has(key))
    .map(([, entry]) => entry.localUri ?? "")

  return {
    nextCacheMap,
    removedLocalUris: dedupeRemovedLocalUris(removedCandidates, collectRetainedLocalUris(nextCacheMap)),
  }
}

export function upsertRemoteImageCacheEntry<T extends IndexedLocalUriEntry>(
  cacheMap: Record<string, T>,
  key: string,
  nextEntry: T,
  maxEntries: number,
): CacheIndexMutationResult<T> {
  const previousEntry = cacheMap[key]
  const pruneResult = pruneRemoteImageCacheEntries(
    {
      ...cacheMap,
      [key]: nextEntry,
    },
    maxEntries,
  )

  return {
    nextCacheMap: pruneResult.nextCacheMap,
    removedLocalUris: dedupeRemovedLocalUris(
      [
        previousEntry?.localUri ?? "",
        ...pruneResult.removedLocalUris,
      ],
      collectRetainedLocalUris(pruneResult.nextCacheMap),
    ),
  }
}

export function removeRemoteImageCacheEntry<T extends IndexedLocalUriEntry>(
  cacheMap: Record<string, T>,
  key: string,
): CacheIndexMutationResult<T> {
  if (!cacheMap[key]) {
    return {
      nextCacheMap: cacheMap,
      removedLocalUris: [],
    }
  }

  const nextCacheMap = { ...cacheMap }
  const removedCandidate = nextCacheMap[key]?.localUri ?? ""
  delete nextCacheMap[key]

  return {
    nextCacheMap,
    removedLocalUris: dedupeRemovedLocalUris([removedCandidate], collectRetainedLocalUris(nextCacheMap)),
  }
}
