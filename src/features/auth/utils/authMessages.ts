import { i18n } from "@/shared/i18n"
import { ApiError } from "@/shared/errors"
import { errorCodeOf, resolveErrorMessage } from "@/shared/errors/presentation"

export function getAuthErrorMessage(error: unknown, fallbackKey = "auth.errors.generic") {
  return resolveErrorMessage(i18n.t.bind(i18n), error, {
    fallbackKey,
    codeMap: {
      "10005": "auth.errors.incorrectPassword",
      "20002": "auth.errors.invalidEmailCaptcha",
      "20010": "auth.errors.passwordReused",
      "20019": "auth.errors.codeExpired",
    },
    statusMap: {
      401: "auth.errors.loginUnauthorized",
    },
  })
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

export function appendApiDebugSuffix(message: string, error: unknown, includeDebugDetails = __DEV__) {
  if (!includeDebugDetails || !(error instanceof ApiError)) {
    return message
  }

  const suffix = [`http=${error.status ?? "unknown"}`, `code=${error.code ?? "none"}`].join(" / ")
  return `${message}\n${suffix}`
}
