export type DevConsoleLevel = "error" | "warn" | "log" | "info" | "debug"

type StructuredRuntimeContext = {
  component?: string
  event: string
  message: string
  details?: unknown
  httpRequest?: unknown
}

type ReactotronDisplayPayload = {
  name: string
  preview?: string
  value?: unknown
  important?: boolean
}

type ReactotronClient = {
  configure: (options?: { name?: string }) => ReactotronClient
  useReactNative: (options?: {
    errors?: boolean
    log?: boolean
    editor?: boolean
    overlay?: boolean
    asyncStorage?: boolean
    networking?: boolean
    storybook?: boolean
    devTools?: boolean
  }) => ReactotronClient
  connect: () => ReactotronClient
  clear: () => void
  display: (payload: ReactotronDisplayPayload) => void
}

const DEV_CONSOLE_GLOBAL_KEY = "__CPCASH_REACTOTRON_CLIENT__"
const DEV_CONSOLE_APP_NAME = "CPCash RN"

function getRuntime() {
  return globalThis as typeof globalThis & {
    [DEV_CONSOLE_GLOBAL_KEY]?: ReactotronClient
  }
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

function isStructuredRuntimeContext(value: unknown): value is StructuredRuntimeContext {
  return isPlainObject(value) && typeof value.event === "string" && typeof value.message === "string"
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

function formatStructuredRuntimeEntry(tag: string, context: StructuredRuntimeContext) {
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

export function formatDevConsoleArgs(args: unknown[]) {
  if (args.length === 2 && typeof args[0] === "string" && isStructuredRuntimeContext(args[1])) {
    return formatStructuredRuntimeEntry(args[0], args[1])
  }

  return args.map(argument => serializeConsoleValue(argument)).join(" ")
}

function getClient() {
  return getRuntime()[DEV_CONSOLE_GLOBAL_KEY] ?? null
}

function loadReactotronModule(): ReactotronClient {
  const mod = require("reactotron-react-native") as { default: ReactotronClient }
  return mod.default
}

export function installDevConsoleCapture() {
  if (!__DEV__) {
    return null
  }

  const existingClient = getClient()
  if (existingClient) {
    return existingClient
  }

  const client = loadReactotronModule()
    .configure({
      name: DEV_CONSOLE_APP_NAME,
    })
    .useReactNative({
      errors: true,
      log: true,
      networking: true,
      editor: false,
      overlay: false,
      asyncStorage: false,
      storybook: false,
      devTools: false,
    })
    .connect()

  getRuntime()[DEV_CONSOLE_GLOBAL_KEY] = client
  return client
}

export function clearDevConsoleEntries() {
  if (!__DEV__) {
    return
  }

  getClient()?.clear()
}

export function resetDevConsoleClientForTests() {
  Reflect.deleteProperty(getRuntime(), DEV_CONSOLE_GLOBAL_KEY)
}

export function recordDevConsoleEntry(level: DevConsoleLevel, args: unknown[]) {
  if (!__DEV__) {
    return
  }

  const client = installDevConsoleCapture()
  if (!client) {
    return
  }

  const message = formatDevConsoleArgs(args)
  const preview = message.split("\n")[0] || `[${level}]`

  client.display({
    name: `log.${level}`,
    preview: truncateText(preview, 160),
    value: {
      level,
      message,
    },
    important: level === "error" || level === "warn",
  })
}
