import { Platform } from "react-native"
import { Contract, Interface, Wallet, id, parseUnits } from "ethers"

import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { getRpcProvider } from "@/shared/web3/balanceService"
import { getJson, removeItem, setJson } from "@/shared/storage/kvStorage"
import { getSecureItem, removeSecureItem, setSecureItem } from "@/shared/storage/secureStorage"
import { parseWalletImportInput } from "@/shared/native/walletImport"
import { useAuthStore } from "@/shared/store/useAuthStore"

import type { WalletImportType } from "@/shared/native/walletImport"

const PASSKEY_CREDENTIALS_KEY = "auth.local_passkey_credentials"
const LOCAL_WALLET_KEY = "auth.local_wallet_private_key"
const PASSKEY_PRIVATE_KEY_PREFIX = "auth.local_passkey_private_key"
const DEFAULT_CHAIN_ID = "199"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const ERC20_TRANSFER_ABI = ["function transfer(address to, uint256 amount) returns (bool)"]
const DEFAULT_ERC20_GAS_LIMIT = 100_000n

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

type LocalWalletRecord = LocalWalletConnection & {
  privateKey: string
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

function createOpaqueId(scope: string) {
  return `${scope}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 10)}`
}

function createPrivateKey(seed: string) {
  return id(`${seed}:${Date.now()}:${Math.random()}:${Platform.OS}`)
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

function writePasskeyCredentials(credentials: StoredPasskeyCredential[]) {
  setJson(PASSKEY_CREDENTIALS_KEY, credentials)
}

function toLocalWalletRecord(privateKey: string, providerName: string): LocalWalletRecord {
  const wallet = new Wallet(privateKey)

  return {
    address: wallet.address,
    chainId: DEFAULT_CHAIN_ID,
    providerName,
    privateKey,
  }
}

async function signLoginPayload(privateKey: string): Promise<SignedLoginPayload> {
  const wallet = new Wallet(privateKey)
  const message = {
    address: wallet.address,
    login_time: Date.now().toString(),
  }

  return {
    address: wallet.address,
    signature: await wallet.signMessage(JSON.stringify(message)),
    message,
  }
}

async function resolveStoredLocalWallet(): Promise<LocalWalletRecord | null> {
  const privateKey = await getSecureItem(LOCAL_WALLET_KEY)

  if (!privateKey) {
    return null
  }

  return toLocalWalletRecord(privateKey, "Local Test Wallet")
}

async function resolveSessionPasskeyWallet(): Promise<LocalWalletRecord | null> {
  const authState = useAuthStore.getState()
  const session = authState.session
  const loginType = authState.loginType ?? session?.loginType
  const rawId = session?.passkeyRawId

  if (loginType !== "passkey" || !rawId) {
    return null
  }

  try {
    return await getLocalPasskeyWallet(rawId)
  } catch {
    return null
  }
}

async function resolveSigningWallet() {
  const passkeyWallet = await resolveSessionPasskeyWallet()
  if (passkeyWallet) {
    return passkeyWallet
  }

  const storedLocalWallet = await resolveStoredLocalWallet()
  if (storedLocalWallet) {
    return storedLocalWallet
  }

  return getOrCreateLocalWallet()
}

export function readLocalWalletCapability() {
  return {
    supported: true,
  }
}

export function createLocalWalletUnavailableError() {
  return new NativeCapabilityUnavailableError("wallet", "Local wallet operation is unavailable in the current flow.")
}

export async function purgeLegacyLocalKeyMaterial() {
  const credentials = readPasskeyCredentials()
  const legacyKeychainKeys = [LOCAL_WALLET_KEY, ...credentials.map(item => passkeyPrivateKeyKey(item.rawId))]

  await Promise.allSettled(legacyKeychainKeys.map(key => removeSecureItem(key)))
  removeItem(PASSKEY_CREDENTIALS_KEY)
}

export async function createLocalPasskeyCredential(username: string): Promise<LocalPasskeyCredential> {
  const trimmedUsername = username.trim()
  const privateKey = createPrivateKey(`passkey:${trimmedUsername}`)
  const wallet = new Wallet(privateKey)
  const rawId = createOpaqueId("raw")
  const credentialId = createOpaqueId("cred")
  const displayName = `${trimmedUsername}${wallet.address.slice(-4)}`

  await setSecureItem(passkeyPrivateKeyKey(rawId), privateKey)

  const nextCredential: StoredPasskeyCredential = {
    rawId,
    credentialId,
    address: wallet.address,
    displayName,
    createdAt: Date.now(),
  }

  const existingCredentials = readPasskeyCredentials().filter(item => item.rawId !== rawId && item.address.toLowerCase() !== wallet.address.toLowerCase())
  writePasskeyCredentials([...existingCredentials, nextCredential])

  const signedPayload = await signLoginPayload(privateKey)

  return {
    ...signedPayload,
    rawId,
    credentialId,
    displayName,
  }
}

export async function authenticateLocalPasskey(rawId?: string): Promise<LocalPasskeyCredential> {
  const credentials = readPasskeyCredentials()
  const credential = rawId
    ? credentials.find(item => item.rawId === rawId)
    : [...credentials].sort((left, right) => right.createdAt - left.createdAt)[0]

  if (!credential) {
    throw new Error("No local passkey credential found")
  }

  const privateKey = await getSecureItem(passkeyPrivateKeyKey(credential.rawId))

  if (!privateKey) {
    throw new Error("Passkey credential is missing")
  }

  const signedPayload = await signLoginPayload(privateKey)

  return {
    ...signedPayload,
    rawId: credential.rawId,
    credentialId: credential.credentialId,
    displayName: credential.displayName,
  }
}

export async function getOrCreateLocalWallet(): Promise<LocalWalletRecord> {
  const existingWallet = await resolveStoredLocalWallet()
  if (existingWallet) {
    return existingWallet
  }

  const privateKey = createPrivateKey("wallet")
  await setSecureItem(LOCAL_WALLET_KEY, privateKey)

  return toLocalWalletRecord(privateKey, "Local Test Wallet")
}

export async function importLocalWallet(secret: string): Promise<ImportedLocalWalletConnection> {
  const importedWallet = parseWalletImportInput(secret)
  await setSecureItem(LOCAL_WALLET_KEY, importedWallet.privateKey)

  return {
    address: importedWallet.address,
    chainId: DEFAULT_CHAIN_ID,
    providerName: importedWallet.type === "mnemonic" ? "Imported Mnemonic Wallet" : "Imported Private Key Wallet",
    importedType: importedWallet.type,
  }
}

export async function signWithLocalWallet(message: string): Promise<{ signature: string }> {
  const wallet = await resolveSigningWallet()
  const signer = new Wallet(wallet.privateKey)

  return {
    signature: await signer.signMessage(message),
  }
}

export async function broadcastTransferWithLocalWallet(params: BroadcastTransferParams): Promise<{ txHash: string }> {
  const wallet = await resolveSigningWallet()
  const provider = getRpcProvider(params.chainId)
  const signer = new Wallet(wallet.privateKey, provider)
  const precision = params.coinPrecision > 0 ? params.coinPrecision : 18
  const amountWei = parseUnits(String(params.amount), precision)
  const isNative = !params.contractAddress || params.contractAddress.toLowerCase() === ZERO_ADDRESS

  if (isNative) {
    const tx = await signer.sendTransaction({
      to: params.toAddress,
      value: amountWei,
    })

    return { txHash: tx.hash }
  }

  const erc20 = new Contract(params.contractAddress, new Interface(ERC20_TRANSFER_ABI), signer)
  const gasLimit = params.gasLimit ? BigInt(params.gasLimit) : DEFAULT_ERC20_GAS_LIMIT
  const tx = await erc20.transfer(params.toAddress, amountWei, { gasLimit })

  return { txHash: tx.hash as string }
}

export async function getLocalPasskeyWallet(rawId: string): Promise<LocalWalletRecord> {
  const privateKey = await getSecureItem(passkeyPrivateKeyKey(rawId))

  if (!privateKey) {
    throw new Error("Passkey credential is missing")
  }

  return toLocalWalletRecord(privateKey, "Local Passkey Wallet")
}
