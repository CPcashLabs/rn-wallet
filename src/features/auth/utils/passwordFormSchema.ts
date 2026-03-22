import { z } from "zod"

import type { PasswordRules } from "@/features/auth/types"
import { validatePasswordAgainstRules } from "@/features/auth/utils/passwordValidation"

type PasswordFormMessages = {
  confirmPasswordRequired: string
  currentPasswordRequired: string
  passwordMismatch: string
  passwordRequired: string
}

export function createCurrentPasswordSchema(messages: PasswordFormMessages) {
  return z.object({
    originPassword: z.string().trim().min(1, messages.currentPasswordRequired),
  })
}

export function createPasswordSetupSchema(rules: PasswordRules | null, messages: PasswordFormMessages) {
  return z
    .object({
      password: z.string().trim().min(1, messages.passwordRequired),
      passwordAgain: z.string().trim().min(1, messages.confirmPasswordRequired),
    })
    .superRefine((values, context) => {
      if (rules) {
        const validationMessage = validatePasswordAgainstRules(values.password, rules)
        if (validationMessage) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: validationMessage,
            path: ["password"],
          })
        }
      }

      if (values.password && values.passwordAgain && values.password !== values.passwordAgain) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.passwordMismatch,
          path: ["passwordAgain"],
        })
      }
    })
}
