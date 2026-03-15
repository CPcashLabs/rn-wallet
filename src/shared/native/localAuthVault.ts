import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { getJson, removeItem } from "@/shared/storage/kvStorage"
import { removeSecureItem } from "@/shared/storage/secureStorage"

import type { WalletImportType } from "@/shared/native/walletImport"

const PASSKEY_CREDENTIALS_KEY = "auth.local_passkey_credentials"
const LOCAL_WALLET_KEY = "auth.local_wallet_private_key"
const PASSKEY_PRIVATE_KEY_PREFIX = "auth.local_passkey_private_key"
const LOCAL_WALLET_UNAVAILABLE_REASON = "Hardware-backed wallet signing is required. This build disables JS-managed private keys."

type StoredPasskeyCredential = {
  rawId: string
  credentialId: string
  address: string
  displayName: string
  createdAt: number
}

type SignedLoginPayload = {
  address: string
  signature: string
  message: {
    address: string
    login_time: string
  }
}

type LocalPasskeyCredential = SignedLoginPayload & {
  rawId: string
  credentialId: string
  displayName: string
}

type LocalWalletConnection = {
  address: string
  chainId: string
  providerName: string
}

type ImportedLocalWalletConnection = LocalWalletConnection & {
  importedType: WalletImportType
}

type BroadcastTransferParams = {
  toAddress: string
  amount: number
  coinPrecision: number
  contractAddress: string
  chainId?: string | number | null
  gasLimit?: number
}

function passkeyPrivateKeyKey(rawId: string) {
  return `${PASSKEY_PRIVATE_KEY_PREFIX}.${rawId}`
}

function readPasskeyCredentials() {
  const credentials = getJson<StoredPasskeyCredential[]>(PASSKEY_CREDENTIALS_KEY)

  if (!Array.isArray(credentials)) {
    return []
  }

  return credentials
}

export function readLocalWalletCapability() {
  return {
    supported: false,
    reason: LOCAL_WALLET_UNAVAILABLE_REASON,
  }
}

export function createLocalWalletUnavailableError() {
  return new NativeCapabilityUnavailableError("wallet", LOCAL_WALLET_UNAVAILABLE_REASON)
}

export async function purgeLegacyLocalKeyMaterial() {
  const credentials = readPasskeyCredentials()
  const legacyKeychainKeys = [LOCAL_WALLET_KEY, ...credentials.map(item => passkeyPrivateKeyKey(item.rawId))]

  await Promise.allSettled(legacyKeychainKeys.map(key => removeSecureItem(key)))
  removeItem(PASSKEY_CREDENTIALS_KEY)
}

export async function createLocalPasskeyCredential(_username: string): Promise<LocalPasskeyCredential> {
  throw createLocalWalletUnavailableError()
}

export async function authenticateLocalPasskey(_rawId?: string): Promise<LocalPasskeyCredential> {
  throw createLocalWalletUnavailableError()
}

export async function getOrCreateLocalWallet(): Promise<LocalWalletConnection> {
  throw createLocalWalletUnavailableError()
}

export async function importLocalWallet(_secret: string): Promise<ImportedLocalWalletConnection> {
  throw createLocalWalletUnavailableError()
}

export async function signWithLocalWallet(_message: string): Promise<{ signature: string }> {
  throw createLocalWalletUnavailableError()
}

export async function broadcastTransferWithLocalWallet(_params: BroadcastTransferParams): Promise<{ txHash: string }> {
  throw createLocalWalletUnavailableError()
}

export async function getLocalPasskeyWallet(_rawId: string): Promise<LocalWalletConnection> {
  throw createLocalWalletUnavailableError()
}
