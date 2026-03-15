export const passwordSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  loginType: "password" as const,
}

export const walletSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  loginType: "wallet" as const,
}

export const canonicalPasskeySession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  address: "0x1234",
  expiresAt: 1_700_000_000,
  loginType: "passkey" as const,
  passkeyRawId: "raw-id-1",
}

export const nextWalletSession = {
  accessToken: "next-access-token",
  refreshToken: "next-refresh-token",
  address: "0xabcd",
  expiresAt: 1_800_000_000,
  loginType: "wallet" as const,
}
