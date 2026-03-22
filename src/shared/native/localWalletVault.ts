import { Contract, Interface, Wallet, parseUnits } from "ethers"

import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { parseWalletImportInput } from "@/shared/native/walletImport"
import { getJson, removeItem } from "@/shared/storage/kvStorage"
import { getSecureItem, removeSecureItem, setSecureItem } from "@/shared/storage/secureStorage"
import { hasSecureRandomValues } from "@/shared/utils/secureRandom"
import { getRpcProvider } from "@/shared/web3/balanceService"

import type { WalletImportType } from "@/shared/native/walletImport"

const PASSKEY_CREDENTIALS_KEY = "auth.local_passkey_credentials"
const LOCAL_WALLET_KEY = "auth.local_wallet_private_key"
const PASSKEY_PRIVATE_KEY_PREFIX = "auth.local_passkey_private_key"
const DEFAULT_CHAIN_ID = "199"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const ERC20_TRANSFER_ABI = ["function transfer(address to, uint256 amount) returns (bool)"]
const DEFAULT_ERC20_GAS_LIMIT = 100_000n

type LegacyPasskeyCredential = {
  rawId: string
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

function passkeyPrivateKeyKey(rawId: string) {
  return `${PASSKEY_PRIVATE_KEY_PREFIX}.${rawId}`
}

function readLegacyPasskeyCredentials() {
  const credentials = getJson<LegacyPasskeyCredential[]>(PASSKEY_CREDENTIALS_KEY)

  if (!Array.isArray(credentials)) {
    return []
  }

  return credentials.filter(item => typeof item?.rawId === "string" && item.rawId.trim())
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

async function resolveStoredLocalWallet(): Promise<LocalWalletRecord | null> {
  const privateKey = await getSecureItem(LOCAL_WALLET_KEY)

  if (!privateKey) {
    return null
  }

  return toLocalWalletRecord(privateKey, "Local Test Wallet")
}

async function resolveSigningWallet() {
  const storedLocalWallet = await resolveStoredLocalWallet()
  if (storedLocalWallet) {
    return storedLocalWallet
  }

  return getOrCreateLocalWallet()
}

function createGeneratedLocalWalletRecord(): LocalWalletRecord {
  if (!hasSecureRandomValues()) {
    throw createLocalWalletUnavailableError()
  }

  return toLocalWalletRecord(Wallet.createRandom().privateKey, "Local Test Wallet")
}

export function readLocalWalletCapability() {
  if (!hasSecureRandomValues()) {
    return {
      supported: false,
    }
  }

  return {
    supported: true,
  }
}

export function createLocalWalletUnavailableError() {
  return new NativeCapabilityUnavailableError("wallet", "Local wallet operation is unavailable in the current flow.")
}

export async function purgeLegacyLocalKeyMaterial() {
  const legacyKeychainKeys = [LOCAL_WALLET_KEY, ...readLegacyPasskeyCredentials().map(item => passkeyPrivateKeyKey(item.rawId))]

  await Promise.allSettled(legacyKeychainKeys.map(key => removeSecureItem(key)))
  removeItem(PASSKEY_CREDENTIALS_KEY)
}

export async function getOrCreateLocalWallet(): Promise<LocalWalletRecord> {
  const existingWallet = await resolveStoredLocalWallet()
  if (existingWallet) {
    return existingWallet
  }

  const wallet = createGeneratedLocalWalletRecord()
  await setSecureItem(LOCAL_WALLET_KEY, wallet.privateKey)

  return wallet
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
