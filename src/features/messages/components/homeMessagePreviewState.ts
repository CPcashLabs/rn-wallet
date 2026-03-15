export function diffHomeMessagePreviewIds(previousIds: string[], nextIds: string[], hasHydrated: boolean) {
  const previousIdSet = new Set(previousIds)
  const nextIdSet = new Set(nextIds)

  return {
    insertedIds: hasHydrated ? nextIds.filter(id => !previousIdSet.has(id)) : [],
    removedIds: previousIds.filter(id => !nextIdSet.has(id)),
  }
}

export function pruneHomeMessagePreviewRecord<T>(record: Record<string, T>, nextIds: string[]) {
  const nextIdSet = new Set(nextIds)

  for (const id of Object.keys(record)) {
    if (!nextIdSet.has(id)) {
      delete record[id]
    }
  }

  return record
}
