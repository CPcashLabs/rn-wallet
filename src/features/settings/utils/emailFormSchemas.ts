import { z } from "zod"

type EmailFormMessages = {
  codeInvalid: string
  codeRequired: string
  emailInvalid: string
  emailRequired: string
}

export function createEmailSchema(messages: EmailFormMessages) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, messages.emailRequired)
      .email(messages.emailInvalid),
  })
}

export function createEmailCodeSchema(messages: EmailFormMessages) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, messages.codeRequired)
      .regex(/^\d{6}$/, messages.codeInvalid),
  })
}
