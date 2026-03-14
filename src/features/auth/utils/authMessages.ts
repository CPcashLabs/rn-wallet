import { i18n } from "@/shared/i18n"
import { ApiError, NativeCapabilityUnavailableError, NetworkUnavailableError } from "@/shared/errors"

function errorCodeOf(error: unknown) {
  if (error instanceof ApiError) {
    return String(error.code ?? "")
  }

  return ""
}

function isPasskeyAssociationErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase()

  return (
    normalized.includes("webcredentials association") ||
    normalized.includes("unable to verify webcredentials") ||
    normalized.includes("apple-app-site-association") ||
    (normalized.includes("associated with domain") && normalized.includes("credential"))
  )
}

export function getAuthErrorMessage(error: unknown, fallbackKey = "auth.errors.generic") {
  if (error instanceof NativeCapabilityUnavailableError) {
    return error.message || i18n.t("auth.errors.capabilityUnavailable")
  }

  if (error instanceof NetworkUnavailableError) {
    return i18n.t("auth.errors.network")
  }

  const code = errorCodeOf(error)

  if (code === "10005") {
    return i18n.t("auth.errors.incorrectPassword")
  }

  if (code === "20002") {
    return i18n.t("auth.errors.invalidEmailCaptcha")
  }

  if (code === "20010") {
    return i18n.t("auth.errors.passwordReused")
  }

  if (code === "20019") {
    return i18n.t("auth.errors.codeExpired")
  }

  if (error instanceof ApiError && error.message) {
    if (error.status === 401) {
      return i18n.t("auth.errors.loginUnauthorized")
    }

    return error.message
  }

  if (error instanceof Error && error.message) {
    if (isPasskeyAssociationErrorMessage(error.message)) {
      return i18n.t("auth.errors.passkeyDomainAssociationFailed")
    }

    return error.message
  }

  return i18n.t(fallbackKey)
}

export function getInviteBindingMessage(error: unknown) {
  const code = errorCodeOf(error)

  if (code === "20023") {
    return i18n.t("auth.errors.inviteLowerLevel")
  }

  if (code === "20020") {
    return i18n.t("auth.errors.inviteAlreadyBound")
  }

  return i18n.t("auth.errors.inviteBindFailed")
}
