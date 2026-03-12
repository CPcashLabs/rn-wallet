import { resetProfileSyncSession } from "@/features/home/hooks/useProfileSync"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"
import { apiClient, authClient } from "@/shared/api/client"
import { writeAuthSession } from "@/shared/api/auth-session"
import type { PasskeyHistoryItem } from "@/shared/types/auth"

import type { AddressValidationResult, AuthenticatedSessionInput, AuthTokens, PasswordRules } from "@/features/auth/types"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type PasswordRulesPayload = {
  password_min_length: number
  rsa_public_key: string
  password_uppercase_required: boolean
  password_lowercase_required: boolean
  password_numeric_required: boolean
  password_special_char_required: boolean
}

type AddressValidationPayload = {
  account_exists: boolean
  password_set: boolean
}

type AuthTokenPayload = {
  access_token: string
  refresh_token: string
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

function toPasswordRules(payload: PasswordRulesPayload): PasswordRules {
  return {
    passwordMinLength: payload.password_min_length,
    rsaPublicKey: payload.rsa_public_key,
    passwordUppercaseRequired: payload.password_uppercase_required,
    passwordLowercaseRequired: payload.password_lowercase_required,
    passwordNumericRequired: payload.password_numeric_required,
    passwordSpecialCharRequired: payload.password_special_char_required,
  }
}

function toAddressValidation(payload: AddressValidationPayload): AddressValidationResult {
  return {
    accountExists: payload.account_exists,
    passwordSet: payload.password_set,
  }
}

function toAuthTokens(payload: AuthTokenPayload): AuthTokens {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  }
}

function extractAuthTokens(payload: ApiEnvelope<AuthTokenPayload> | AuthTokenPayload) {
  if ("access_token" in payload && "refresh_token" in payload) {
    return toAuthTokens(payload)
  }

  return toAuthTokens(unwrapEnvelope(payload))
}

function sanitizeAddress(address: string) {
  return address.trim()
}

export async function validateAddressExists(address: string) {
  const response = await apiClient.get<ApiEnvelope<AddressValidationPayload>>(`/api/system/member/security/validate-address-exists/${sanitizeAddress(address)}`)
  return toAddressValidation(unwrapEnvelope(response.data))
}

export async function getPasswordRules() {
  const response = await apiClient.get<ApiEnvelope<PasswordRulesPayload>>("/api/system/member/config/get-password-rules")
  return toPasswordRules(unwrapEnvelope(response.data))
}

export async function signInWithPassword(address: string, password: string) {
  const sanitizedAddress = sanitizeAddress(address)
  const body = new URLSearchParams()
  body.append("client_id", "MEMBER")
  body.append("client_secret", "123456")
  body.append("grant_type", "address_password")
  body.append("address", sanitizedAddress)
  body.append("password", password)

  const response = await authClient.post<ApiEnvelope<AuthTokenPayload> | AuthTokenPayload>("/api/auth/oauth2/token", body.toString())

  return extractAuthTokens(response.data)
}

export async function signInWithMessageSignature(params: { signature: string; address: string; message: string }) {
  const sanitizedAddress = sanitizeAddress(params.address)
  const body = new URLSearchParams()
  body.append("client_id", "MEMBER")
  body.append("client_secret", "123456")
  body.append("grant_type", "message_signature")
  body.append("signature", params.signature)
  body.append("address", sanitizedAddress)
  body.append("message", params.message)

  const response = await authClient.post<ApiEnvelope<AuthTokenPayload> | AuthTokenPayload>("/api/auth/oauth2/token", body.toString())

  return extractAuthTokens(response.data)
}

export async function bindInviteCode(inviteCode: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/api/system/member/memberrelation/bind?invite_code=${encodeURIComponent(inviteCode)}`)
  return unwrapEnvelope(response.data)
}

export async function getEmailByAddress(address: string) {
  const response = await apiClient.get<ApiEnvelope<string>>(`/api/system/member/security/get-email-by-address/${sanitizeAddress(address)}`)
  return unwrapEnvelope(response.data)
}

export async function sendPasswordResetEmail(address: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/api/system/member/security/send-reset-password-email-by-address/${sanitizeAddress(address)}`)
  return unwrapEnvelope(response.data)
}

export async function validatePasswordResetCaptcha(params: { address: string; emailCaptcha: string }) {
  const response = await apiClient.post<ApiEnvelope<string>>("/api/system/member/security/validate-reset-password-email-captcha-by-address", {
    address: sanitizeAddress(params.address),
    email_captcha: params.emailCaptcha,
  })

  return unwrapEnvelope(response.data)
}

export async function registerPassword(params: { address: string; passwordEncrypted: string }) {
  const response = await apiClient.post<ApiEnvelope<boolean>>("/api/system/member/security/cp-cash-register-rsa", {
    address: sanitizeAddress(params.address),
    password_encrypted: params.passwordEncrypted,
  })

  return unwrapEnvelope(response.data)
}

export async function resetPasswordByAddress(params: {
  address: string
  passwordEncrypted: string
  randomString?: string
  signature?: string
  message?: string
}) {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/system/member/security/reset-password-by-address-rsa", {
    address: sanitizeAddress(params.address),
    password_encrypted: params.passwordEncrypted,
    random_string: params.randomString,
    signature: params.signature,
    message: params.message,
  })

  return unwrapEnvelope(response.data)
}

export async function validateLoggedInPassword(oldPasswordEncrypted: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>("/api/system/member/security/validate-password-rsa", {
    old_password_encrypted: oldPasswordEncrypted,
  })

  return unwrapEnvelope(response.data)
}

export async function resetPasswordLoggedIn(params: {
  oldPasswordEncrypted: string
  newPasswordEncrypted: string
  confirmPasswordEncrypted: string
}) {
  const response = await apiClient.post<ApiEnvelope<boolean>>("/api/system/member/security/reset-password-logined-rsa", {
    old_password_encrypted: params.oldPasswordEncrypted,
    new_password_encrypted: params.newPasswordEncrypted,
    confirm_password_encrypted: params.confirmPasswordEncrypted,
  })

  return unwrapEnvelope(response.data)
}

export async function updateNickname(nickname: string) {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/system/member/security/update", {
    nickname,
  })

  return unwrapEnvelope(response.data)
}

export async function persistAuthenticatedSession(input: AuthenticatedSessionInput) {
  const session = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    address: input.address,
    loginType: input.loginType,
    passkeyRawId: input.passkeyRawId,
  }

  await writeAuthSession(session)

  resetProfileSyncSession()
  useAuthStore.getState().setSession(session)
  useAuthStore.getState().setLoginType(input.loginType)
  if (!useUserStore.getState().profile?.address) {
    useUserStore.getState().patchProfile({
      address: input.address,
    })
  }
  const walletState = useWalletStore.getState()
  useWalletStore.getState().setWalletState({
    status: "connected",
    address: input.address,
    chainId: walletState.chainId ?? DEFAULT_WALLET_CHAIN_ID,
  })
}

export function saveRecentPasskey(entry: PasskeyHistoryItem) {
  useAuthStore.getState().addRecentPasskey(entry)
}
