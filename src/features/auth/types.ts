import type { AuthLoginType } from "@/shared/types/auth"

export type PasswordRules = {
  passwordMinLength: number
  rsaPublicKey: string
  passwordUppercaseRequired: boolean
  passwordLowercaseRequired: boolean
  passwordNumericRequired: boolean
  passwordSpecialCharRequired: boolean
}

export type AddressValidationResult = {
  accountExists: boolean
  passwordSet: boolean
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthenticatedSessionInput = AuthTokens & {
  address: string
  loginType: AuthLoginType
  passkeyRawId?: string
}
