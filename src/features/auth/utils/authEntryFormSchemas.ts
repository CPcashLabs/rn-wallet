import { z } from "zod"

import { tryParseWalletImportInput } from "@/shared/native/walletImport"

type AddressFormMessages = {
  addressRequired: string
}

type PasswordLoginFormMessages = AddressFormMessages & {
  passwordRequired: string
  passwordTooShort: string
}

type VerificationCodeFormMessages = {
  codeInvalid: string
  codeRequired: string
}

type ImportSecretFormMessages = {
  importSecretRequired: string
  invalidImportSecret: string
}

type NicknameFormMessages = {
  nicknameRequired: string
}

export function createAddressSchema(messages: AddressFormMessages) {
  return z.object({
    address: z.string().trim().min(1, messages.addressRequired),
  })
}

export function createPasswordLoginSchema(minLength: number, messages: PasswordLoginFormMessages) {
  return z.object({
    address: z.string().trim().min(1, messages.addressRequired),
    password: z
      .string()
      .trim()
      .min(1, messages.passwordRequired)
      .min(minLength, messages.passwordTooShort),
  })
}

export function createVerificationCodeSchema(messages: VerificationCodeFormMessages) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, messages.codeRequired)
      .regex(/^\d{6}$/, messages.codeInvalid),
  })
}

export function createImportSecretSchema(messages: ImportSecretFormMessages) {
  return z
    .object({
      secret: z.string().trim().min(1, messages.importSecretRequired),
    })
    .superRefine((values, context) => {
      if (!values.secret.trim()) {
        return
      }

      if (!tryParseWalletImportInput(values.secret)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.invalidImportSecret,
          path: ["secret"],
        })
      }
    })
}

export function createNicknameSchema(messages: NicknameFormMessages) {
  return z.object({
    nickname: z.string().trim().min(1, messages.nicknameRequired),
  })
}
