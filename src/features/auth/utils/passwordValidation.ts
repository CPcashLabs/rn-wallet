import { i18n } from "@/shared/i18n"

import type { PasswordRules } from "@/features/auth/types"

export function validatePasswordAgainstRules(password: string, rules: PasswordRules) {
  if (password.length < rules.passwordMinLength) {
    return i18n.t("auth.errors.passwordTooShort", {
      min: rules.passwordMinLength,
    })
  }

  if (rules.passwordUppercaseRequired && !/[A-Z]/.test(password)) {
    return i18n.t("auth.errors.passwordRuleMismatch")
  }

  if (rules.passwordLowercaseRequired && !/[a-z]/.test(password)) {
    return i18n.t("auth.errors.passwordRuleMismatch")
  }

  if (rules.passwordNumericRequired && !/\d/.test(password)) {
    return i18n.t("auth.errors.passwordRuleMismatch")
  }

  if (rules.passwordSpecialCharRequired && !/[^A-Za-z0-9]/.test(password)) {
    return i18n.t("auth.errors.passwordRuleMismatch")
  }

  return null
}
