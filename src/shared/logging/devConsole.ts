import { useSyncExternalStore } from "react"

export type DevConsoleLevel = "error" | "warn" | "log" | "info" | "debug"
export type DevConsoleFilter = "all" | "error" | "warn" | "runtime"

export type DevConsoleEntry = {
  id: string
  level: DevConsoleLevel
  message: string
  timestamp: number
}

type ConsoleMethod = (...args: unknown[]) => void

type DevConsoleStore = {
  entries: DevConsoleEntry[]
  installed: boolean
  listeners: Set<() => void>
  nextId: number
  original: Partial<Record<DevConsoleLevel, ConsoleMethod>>
}

const DEV_CONSOLE_MAX_ENTRIES = 300
const DEV_CONSOLE_GLOBAL_KEY = "__CPCASH_DEV_CONSOLE__"

function getStore(): DevConsoleStore {
  const runtime = globalThis as typeof globalThis & {
    [DEV_CONSOLE_GLOBAL_KEY]?: DevConsoleStore
  }

  if (!runtime[DEV_CONSOLE_GLOBAL_KEY]) {
    runtime[DEV_CONSOLE_GLOBAL_KEY] = {
      entries: [],
      installed: false,
      listeners: new Set(),
      nextId: 0,
      original: {},
    }
  }

  return runtime[DEV_CONSOLE_GLOBAL_KEY]
}

function emitChange() {
  const store = getStore()
  store.listeners.forEach(listener => listener())
}

function truncateText(value: string, maxLength = 2400) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3)}...`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function compactObjectSummary(value: Record<string, unknown>) {
  return Object.entries(value)
    .map(([key, nestedValue]) => `${key}=${serializeConsoleValue(nestedValue)}`)
    .join(" ")
}

function isStructuredRuntimeContext(
  value: unknown,
): value is {
  component?: string
  event: string
  message: string
  details?: unknown
  httpRequest?: unknown
} {
  return (
    isPlainObject(value) &&
    typeof value.event === "string" &&
    typeof value.message === "string"
  )
}

function formatHttpRequestSummary(httpRequest: unknown) {
  if (!isPlainObject(httpRequest)) {
    return ""
  }

  const parts: string[] = []
  if (typeof httpRequest.requestMethod === "string" && httpRequest.requestMethod.trim()) {
    parts.push(httpRequest.requestMethod.trim().toUpperCase())
  }
  if (typeof httpRequest.requestUrl === "string" && httpRequest.requestUrl.trim()) {
    parts.push(httpRequest.requestUrl.trim())
  }
  if (typeof httpRequest.status === "number") {
    parts.push(`status=${httpRequest.status}`)
  }

  return parts.join(" ")
}

function formatStructuredRuntimeEntry(tag: string, context: {
  event: string
  message: string
  details?: unknown
  httpRequest?: unknown
}) {
  const lines = [`${tag} ${context.event}`, context.message]
  const httpSummary = formatHttpRequestSummary(context.httpRequest)

  if (httpSummary) {
    lines.push(httpSummary)
  }

  if (isPlainObject(context.details) && Object.keys(context.details).length > 0) {
    lines.push(compactObjectSummary(context.details))
  } else if (context.details !== undefined) {
    lines.push(serializeConsoleValue(context.details))
  }

  return truncateText(lines.filter(Boolean).join("\n"))
}

function serializeConsoleValue(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): string {
  if (typeof value === "string") {
    return truncateText(value)
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value)
  }

  if (value instanceof Error) {
    return truncateText(value.stack || `${value.name}: ${value.message}`)
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`
  }

  if (typeof value !== "object") {
    return truncateText(String(value))
  }

  if (seen.has(value)) {
    return "[Circular]"
  }

  seen.add(value)

  if (Array.isArray(value)) {
    if (depth >= 2) {
      return `[Array(${value.length})]`
    }

    return truncateText(
      JSON.stringify(
        value.map(item => serializeConsoleValue(item, seen, depth + 1)),
      ),
    )
  }

  if (depth >= 2) {
    const constructorName = (value as { constructor?: { name?: string } }).constructor?.name
    return `[${constructorName || "Object"}]`
  }

  try {
    const seenInJson = new WeakSet<object>()

    return truncateText(
      JSON.stringify(
        value,
        (key, nestedValue) => {
          if (typeof nestedValue === "bigint") {
            return nestedValue.toString()
          }

          if (nestedValue instanceof Error) {
            return nestedValue.stack || `${nestedValue.name}: ${nestedValue.message}`
          }

          if (typeof nestedValue === "function") {
            return `[Function ${nestedValue.name || "anonymous"}]`
          }

          if (nestedValue && typeof nestedValue === "object") {
            if (key === "") {
              seenInJson.add(nestedValue)
              return nestedValue
            }

            if (seenInJson.has(nestedValue)) {
              return "[Circular]"
            }

            seenInJson.add(nestedValue)
          }

          return nestedValue
        },
        2,
      ),
    )
  } catch {
    return truncateText(String(value))
  }
}

function formatConsoleArgs(args: unknown[]) {
  if (args.length === 2 && typeof args[0] === "string" && isStructuredRuntimeContext(args[1])) {
    return formatStructuredRuntimeEntry(args[0], args[1])
  }

  return args.map(argument => serializeConsoleValue(argument)).join(" ")
}

function appendEntry(level: DevConsoleLevel, args: unknown[]) {
  const store = getStore()

  store.entries = [
    {
      id: `${Date.now()}-${store.nextId}`,
      level,
      message: formatConsoleArgs(args),
      timestamp: Date.now(),
    },
    ...store.entries,
  ].slice(0, DEV_CONSOLE_MAX_ENTRIES)
  store.nextId += 1

  emitChange()
}

export function recordDevConsoleEntry(level: DevConsoleLevel, args: unknown[]) {
  if (!__DEV__) {
    return
  }

  appendEntry(level, args)
}

export function installDevConsoleCapture() {
  if (!__DEV__) {
    return
  }

  const store = getStore()

  if (store.installed) {
    return
  }

  const levels: DevConsoleLevel[] = ["error", "warn", "log", "info", "debug"]

  levels.forEach(level => {
    const originalMethod = console[level]?.bind(console) as ConsoleMethod | undefined

    store.original[level] = originalMethod ?? console.log.bind(console)

    console[level] = (...args: unknown[]) => {
      appendEntry(level, args)
      store.original[level]?.(...args)
    }
  })

  store.installed = true
}

export function clearDevConsoleEntries() {
  if (!__DEV__) {
    return
  }

  const store = getStore()
  store.entries = []
  emitChange()
}

export function useDevConsoleEntries() {
  return useSyncExternalStore(
    listener => {
      const store = getStore()
      store.listeners.add(listener)

      return () => {
        store.listeners.delete(listener)
      }
    },
    () => getStore().entries,
    () => [],
  )
}

export function countDevConsoleEntries(filter: DevConsoleFilter) {
  return getDevConsoleEntriesByFilter(filter).length
}

export function getDevConsoleEntriesByFilter(filter: DevConsoleFilter) {
  const entries = getStore().entries

  switch (filter) {
    case "error":
      return entries.filter(entry => entry.level === "error")
    case "warn":
      return entries.filter(entry => entry.level === "warn")
    case "runtime":
      return entries.filter(entry => entry.level === "log" || entry.level === "info" || entry.level === "debug")
    default:
      return entries
  }
}
