import { createJSONStorage, type PersistStorage, type StateStorage, type StorageValue } from "zustand/middleware"

import { getString, removeItem, setString } from "@/shared/storage/kvStorage"

type CreateKvJsonStorageOptions<PersistedState> = {
  migrateLegacy?: (raw: unknown) => PersistedState | null
  shouldRemove?: (state: PersistedState) => boolean
}

export function createKvJsonStorage<PersistedState>(
  options: CreateKvJsonStorageOptions<PersistedState> = {},
): PersistStorage<PersistedState> {
  const stateStorage: StateStorage = {
    getItem: name => {
      const rawValue = getString(name)
      if (!rawValue) {
        return null
      }

      const normalizedValue = normalizePersistedValue(rawValue, options.migrateLegacy)
      return normalizedValue ? JSON.stringify(normalizedValue) : null
    },
    setItem: (name, value) => {
      const persistedValue = parseStorageValue<PersistedState>(value)
      if (persistedValue && options.shouldRemove?.(persistedValue.state)) {
        removeItem(name)
        return
      }

      setString(name, value)
    },
    removeItem: name => {
      removeItem(name)
    },
  }

  const storage = createJSONStorage<PersistedState>(() => stateStorage)
  if (!storage) {
    throw new Error("Failed to create KV JSON storage.")
  }

  return storage
}

function normalizePersistedValue<PersistedState>(
  rawValue: string,
  migrateLegacy?: (raw: unknown) => PersistedState | null,
): StorageValue<PersistedState> | null {
  const parsedValue = parseJson(rawValue)
  if (parsedValue === null) {
    return null
  }

  if (isStorageValue(parsedValue)) {
    return parsedValue as StorageValue<PersistedState>
  }

  if (!migrateLegacy) {
    return null
  }

  const legacyState = migrateLegacy(parsedValue)
  if (legacyState === null) {
    return null
  }

  return {
    state: legacyState,
    version: 0,
  }
}

function parseStorageValue<PersistedState>(rawValue: string) {
  const parsedValue = parseJson(rawValue)
  if (!isStorageValue(parsedValue)) {
    return null
  }

  return parsedValue as StorageValue<PersistedState>
}

function parseJson(rawValue: string) {
  try {
    return JSON.parse(rawValue) as unknown
  } catch {
    return null
  }
}

function isStorageValue(value: unknown): value is StorageValue<unknown> {
  return typeof value === "object" && value !== null && "state" in value
}
