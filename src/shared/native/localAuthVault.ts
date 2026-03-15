import { Platform } from "react-native"
import { Contract, Interface, Wallet, id, parseUnits } from "ethers"

import { getRpcProvider } from "@/shared/web3/balanceService"
import { getSecureItem, setSecureItem } from "@/shared/storage/secureStorage"
import { getJson, setJson } from "@/shared/storage/kvStorage"
import { parseWalletImportInput } from "@/shared/native/walletImport"

const PASSKEY_CREDENTIALS_KEY = "auth.local_passkey_credentials"
const LOCAL_WALLET_KEY = "auth.local_wallet_private_key"
const PASSKEY_PRIVATE_KEY_PREFIX = "auth.local_passkey_private_key"
const DEFAULT_CHAIN_ID = "199"

type StoredPasskeyCredential = {
  rawId: string
  credentialId: string
  address: string
  displayName: string
  createdAt: number
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

async function signLoginPayload(privateKey: string) {
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

export async function createLocalPasskeyCredential(username: string) {
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

export async function authenticateLocalPasskey(rawId?: string) {
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

export async function getOrCreateLocalWallet() {
  let privateKey = await getSecureItem(LOCAL_WALLET_KEY)

  if (!privateKey) {
    privateKey = createPrivateKey("wallet")
    await setSecureItem(LOCAL_WALLET_KEY, privateKey)
  }

  const wallet = new Wallet(privateKey)

  return {
    address: wallet.address,
    chainId: DEFAULT_CHAIN_ID,
    providerName: "Local Test Wallet",
    privateKey,
  }
}

export async function importLocalWallet(secret: string) {
  const importedWallet = parseWalletImportInput(secret)
  await setSecureItem(LOCAL_WALLET_KEY, importedWallet.privateKey)

  return {
    address: importedWallet.address,
    chainId: DEFAULT_CHAIN_ID,
    providerName: importedWallet.type === "mnemonic" ? "Imported Mnemonic Wallet" : "Imported Private Key Wallet",
    privateKey: importedWallet.privateKey,
    importedType: importedWallet.type,
  }
}

export async function signWithLocalWallet(message: string) {
  const wallet = await getOrCreateLocalWallet()
  const signer = new Wallet(wallet.privateKey)

  return {
    signature: await signer.signMessage(message),
  }
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const ERC20_TRANSFER_ABI = ["function transfer(address to, uint256 amount) returns (bool)"]
const DEFAULT_ERC20_GAS_LIMIT = 100_000n

export async function broadcastTransferWithLocalWallet(params: {
  toAddress: string
  amount: number
  coinPrecision: number
  contractAddress: string
  chainId?: string | number | null
  gasLimit?: number
}) {
  const { privateKey } = await getOrCreateLocalWallet()
  const provider = getRpcProvider(params.chainId)
  const signer = new Wallet(privateKey, provider)
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

export async function getLocalPasskeyWallet(rawId: string) {
  const privateKey = await getSecureItem(passkeyPrivateKeyKey(rawId))

  if (!privateKey) {
    throw new Error("Passkey credential is missing")
  }

  const wallet = new Wallet(privateKey)

  return {
    address: wallet.address,
    chainId: DEFAULT_CHAIN_ID,
    providerName: "Local Passkey Wallet",
    privateKey,
  }
}
