export type TokenPair = {
  accessToken: string
  refreshToken: string
}

export type AuthLoginType = "wallet" | "passkey" | "password"

export type PasskeyHistoryItem = {
  credentialId: string
  rawId: string
  name: string
  address?: string
}

export type AuthSession = TokenPair & {
  address?: string
  expiresAt?: number
  loginType?: AuthLoginType
  passkeyRawId?: string
}

export type UserProfile = {
  id?: string
  address?: string
  nickname?: string
  email?: string
  avatar?: string
  levelRank?: number
  inviteBound?: boolean
  walletIsBackup?: boolean
  transferEmailNotifyEnable?: boolean
  rewardEmailNotifyEnable?: boolean
  receiptEmailNotifyEnable?: boolean
  backupWalletNotifyEnable?: boolean
}
