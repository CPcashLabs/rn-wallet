import { recordDevConsoleEntry } from "@/shared/logging/devConsole"

const CONTROL_CHARACTERS_PATTERN = /[\u0000-\u001F\u007F]/g
const QUERY_SECRET_PATTERN =
  /([?&](?:access_token|token|refresh_token|id_token|authorization|code|signature|sig|address|wallet|copouch|cowallet|txid|orderSn|order_sn)=)[^&#\s]+/gi
const ABSOLUTE_URL_QUERY_PATTERN = /(https?:\/\/[^\s?#]+)\?[^#\s]+/gi
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const EVM_ADDRESS_PATTERN = /(^|[^A-Za-z0-9_])((?:0x|0X)[A-Fa-f0-9]{40})(?=[^A-Za-z0-9_]|$)/g
const TRON_ADDRESS_PATTERN = /(^|[^A-Za-z0-9_])(T[a-zA-Z0-9]{33})(?=[^A-Za-z0-9_]|$)/g
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g
const MAX_LOG_STRING_LENGTH = 180

type LogErrorOptions = {
  context?: unknown
  devMode?: boolean
  forwardToConsole?: boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function summarizeDataShape(value: unknown) {
  if (Array.isArray(value)) {
    return `array(${value.length})`
  }

  if (value === null) {
    return "null"
  }

  return typeof value
}

function redactDelimitedPattern(value: string, pattern: RegExp, replacement: string) {
  return value.replace(pattern, (_match, prefix: string) => `${prefix}${replacement}`)
}

function sanitizeLogString(value: string) {
  const withoutAddresses = redactDelimitedPattern(
    redactDelimitedPattern(value, EVM_ADDRESS_PATTERN, "[REDACTED_EVM_ADDRESS]"),
    TRON_ADDRESS_PATTERN,
    "[REDACTED_TRON_ADDRESS]",
  )

  const sanitized = withoutAddresses
    .replace(CONTROL_CHARACTERS_PATTERN, " ")
    .replace(ABSOLUTE_URL_QUERY_PATTERN, "$1?[REDACTED_QUERY]")
    .replace(QUERY_SECRET_PATTERN, "$1[REDACTED]")
    .replace(BEARER_TOKEN_PATTERN, "Bearer [REDACTED]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(/\s+/g, " ")
    .trim()

  if (sanitized.length <= MAX_LOG_STRING_LENGTH) {
    return sanitized
  }

  return `${sanitized.slice(0, MAX_LOG_STRING_LENGTH - 3)}...`
}

function sanitizeAxiosConfigSummary(config: Record<string, unknown>) {
  const summary: Record<string, unknown> = {}

  if (typeof config.method === "string" && config.method.trim()) {
    summary.method = config.method.trim().toUpperCase()
  }

  if (typeof config.baseURL === "string" && config.baseURL.trim()) {
    summary.baseURL = sanitizeLogString(config.baseURL)
  }

  if (typeof config.url === "string" && config.url.trim()) {
    summary.url = sanitizeLogString(config.url)
  }

  if (typeof config.timeout === "number") {
    summary.timeout = config.timeout
  }

  return summary
}

function sanitizeAxiosResponseSummary(response: Record<string, unknown>) {
  const summary: Record<string, unknown> = {}

  if (typeof response.status === "number") {
    summary.status = response.status
  }

  if ("data" in response) {
    summary.dataType = summarizeDataShape(response.data)
  }

  return summary
}

function sanitizeErrorLike(error: Error | Record<string, unknown>, depth: number): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    name: typeof error.name === "string" && error.name.trim() ? error.name : "Error",
  }

  if (typeof error.message === "string" && error.message.trim()) {
    summary.message = sanitizeLogString(error.message)
  }

  const code = Reflect.get(error, "code")
  if (typeof code === "string" || typeof code === "number") {
    summary.code = String(code)
  }

  const status = Reflect.get(error, "status")
  if (typeof status === "number") {
    summary.status = status
  }

  if (Reflect.get(error, "isAxiosError") === true) {
    summary.kind = "AxiosError"

    const config = Reflect.get(error, "config")
    if (isPlainObject(config)) {
      const configSummary = sanitizeAxiosConfigSummary(config)
      if (Object.keys(configSummary).length > 0) {
        summary.config = configSummary
      }
    }

    const response = Reflect.get(error, "response")
    if (isPlainObject(response)) {
      const responseSummary = sanitizeAxiosResponseSummary(response)
      if (Object.keys(responseSummary).length > 0) {
        summary.response = responseSummary
        if (summary.status == null && typeof responseSummary.status === "number") {
          summary.status = responseSummary.status
        }
      }
    }
  }

  const cause = Reflect.get(error, "cause")
  if (cause !== undefined && depth < 1) {
    summary.cause = sanitizeLogValue(cause, depth + 1)
  }

  return summary
}

function sanitizeObjectSummary(value: Record<string, unknown>, depth: number): Record<string, unknown> {
  const summary: Record<string, unknown> = {}

  if (typeof value.name === "string" && value.name.trim()) {
    summary.name = sanitizeLogString(value.name)
  }

  if (typeof value.message === "string" && value.message.trim()) {
    summary.message = sanitizeLogString(value.message)
  }

  if (typeof value.code === "string" || typeof value.code === "number") {
    summary.code = String(value.code)
  }

  if (typeof value.status === "number") {
    summary.status = value.status
  }

  if (typeof value.ok === "boolean") {
    summary.ok = value.ok
  }

  if (typeof value.type === "string" && value.type.trim()) {
    summary.type = sanitizeLogString(value.type)
  }

  if (typeof value.url === "string" && value.url.trim()) {
    summary.url = sanitizeLogString(value.url)
  }

  if (typeof value.baseURL === "string" && value.baseURL.trim()) {
    summary.baseURL = sanitizeLogString(value.baseURL)
  }

  if (typeof value.componentStack === "string") {
    summary.componentStackFrames = value.componentStack
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean).length
  }

  if (isPlainObject(value.config)) {
    const configSummary = sanitizeAxiosConfigSummary(value.config)
    if (Object.keys(configSummary).length > 0) {
      summary.config = configSummary
    }
  }

  if (isPlainObject(value.response)) {
    const responseSummary = sanitizeAxiosResponseSummary(value.response)
    if (Object.keys(responseSummary).length > 0) {
      summary.response = responseSummary
      if (summary.status == null && typeof responseSummary.status === "number") {
        summary.status = responseSummary.status
      }
    }
  }

  const cause = value.cause
  if (cause !== undefined && depth < 1) {
    summary.cause = sanitizeLogValue(cause, depth + 1)
  }

  if (Object.keys(summary).length > 0) {
    return summary
  }

  return {
    kind: value.constructor?.name || "Object",
  }
}

export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return sanitizeLogString(value)
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value
  }

  if (value instanceof Error) {
    return sanitizeErrorLike(value, depth)
  }

  if (Array.isArray(value)) {
    return {
      kind: "Array",
      length: value.length,
    }
  }

  if (isPlainObject(value)) {
    return sanitizeObjectSummary(value, depth)
  }

  return String(value)
}

export function logErrorSafely(tag: string, error: unknown, options?: LogErrorOptions) {
  const devMode = options?.devMode ?? __DEV__

  if (devMode) {
    const args = options?.context !== undefined ? [tag, error, options.context] : [tag, error]

    if (options?.forwardToConsole === false) {
      recordDevConsoleEntry("error", args)
      return
    }

    if (options?.context !== undefined) {
      console.error(tag, error, options.context)
      return
    }

    console.error(tag, error)
    return
  }

  const safeError = sanitizeLogValue(error)
  if (options?.context !== undefined) {
    console.error(tag, safeError, sanitizeLogValue(options.context))
    return
  }

  console.error(tag, safeError)
}
