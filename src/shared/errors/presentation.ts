import { ApiError, NativeCapabilityUnavailableError, NetworkUnavailableError } from "@/shared/errors"

export type Translate = (key: string, options?: Record<string, unknown>) => string

export type ErrorMessageOptions = {
  fallbackKey: string
  codeMap?: Record<string, string>
  statusMap?: Partial<Record<number, string>>
  preferApiMessage?: boolean
  preferErrorMessage?: boolean
  customResolver?: (error: unknown, t: Translate) => string | undefined
}

export function errorCodeOf(error: unknown) {
  if (error instanceof ApiError) {
    return String(error.code ?? "")
  }

  if (error && typeof error === "object") {
    const code = Reflect.get(error, "code")
    if (typeof code === "string" || typeof code === "number") {
      return String(code)
    }
  }

  return ""
}

export function isPasskeyAssociationErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase()

  return (
    normalized.includes("webcredentials association") ||
    normalized.includes("unable to verify webcredentials") ||
    normalized.includes("apple-app-site-association") ||
    (normalized.includes("associated with domain") && normalized.includes("credential"))
  )
}

export function resolveErrorMessage(t: Translate, error: unknown, options: ErrorMessageOptions) {
  const customMessage = options.customResolver?.(error, t)?.trim()
  if (customMessage) {
    return customMessage
  }

  if (error instanceof NativeCapabilityUnavailableError) {
    return error.message || t("common.errors.capabilityUnavailable")
  }

  if (error instanceof NetworkUnavailableError) {
    return t("common.errors.network")
  }

  const code = errorCodeOf(error)
  if (code && options.codeMap?.[code]) {
    return t(options.codeMap[code])
  }

  if (error instanceof ApiError) {
    const statusKey = error.status != null ? options.statusMap?.[error.status] : undefined
    if (statusKey) {
      return t(statusKey)
    }

    if (options.preferApiMessage !== false && error.message.trim()) {
      return error.message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    if (isPasskeyAssociationErrorMessage(error.message)) {
      return t("auth.errors.passkeyDomainAssociationFailed")
    }

    if (options.preferErrorMessage !== false) {
      return error.message
    }
  }

  return t(options.fallbackKey)
}
