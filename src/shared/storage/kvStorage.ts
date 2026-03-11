import { MMKV } from "react-native-mmkv"

const storage = new MMKV({
  id: "cpcash-rn",
})

export function setString(key: string, value: string) {
  storage.set(key, value)
}

export function getString(key: string) {
  return storage.getString(key) ?? null
}

export function setNumber(key: string, value: number) {
  storage.set(key, value)
}

export function getNumber(key: string) {
  const value = storage.getNumber(key)
  return typeof value === "number" ? value : null
}

export function setBoolean(key: string, value: boolean) {
  storage.set(key, value)
}

export function getBoolean(key: string) {
  const value = storage.getBoolean(key)
  return typeof value === "boolean" ? value : null
}

export function setJson(key: string, value: unknown) {
  storage.set(key, JSON.stringify(value))
}

export function getJson<T>(key: string) {
  const raw = storage.getString(key)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function removeItem(key: string) {
  storage.delete(key)
}

export function getStorage() {
  return storage
}
