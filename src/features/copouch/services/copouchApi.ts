import { Contract, Interface, Wallet, ZeroAddress, formatUnits } from "ethers"

import { getCoinList, resolveChainNameById, type HomeCoin } from "@/features/home/services/homeApi"
import { apiClient } from "@/shared/api/client"
import { ApiError } from "@/shared/errors"
import { getLocalPasskeyWallet, getOrCreateLocalWallet } from "@/shared/native/localAuthVault"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { fetchOnChainBalances, getRpcProvider } from "@/shared/web3/balanceService"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type CopouchListPayloadItem = {
  id?: string | number
  wallet_address?: string
  wallet_name?: string
  wallet_type?: number
  chain_name?: string
  is_creator?: boolean
  created_at?: string
  updated_at?: string
  owner_count?: number
  status?: number
  wallet_bg_color?: number
  owner?: Array<{
    user_id?: string
    wallet_address?: string
    avatar?: string | null
  }>
}

type CopouchDetailPayload = CopouchListPayloadItem & {
  first_enter_status?: number
  event_message_count?: number
}

type CopouchOwnerPayload = {
  user_id?: string
  nickname?: string
  wallet_address?: string
  avatar?: string | null
  is_creator?: boolean
  status?: number
}

export type CopouchWallet = {
  id: string
  walletAddress: string
  walletName: string
  walletType: number
  chainName: string
  isCreator: boolean
  createdAt: string
  updatedAt: string
  ownerCount: number
  status: number
  walletBgColor: number
  ownerPreview: Array<{
    userId: string
    walletAddress: string
    avatar: string | null
  }>
  totalValue: number
}

export type CopouchOwner = {
  userId: string
  nickname: string
  walletAddress: string
  avatar: string | null
  isCreator: boolean
  status: number
}

export type CopouchDetail = CopouchWallet & {
  firstEnterStatus: number
  eventMessageCount: number
}

export type CopouchOverview = {
  wallets: CopouchWallet[]
  walletLimit: number
  ownerLimit: number
  finishedCount: number
  bttBalance: number
}

const SAFE_SETUP_ABI = [
  "function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)",
]

const SAFE_PROXY_FACTORY_ABI = [
  "function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
]

const SAFE_NETWORKS: Record<number, { safeSingletonAddress: string; safeProxyFactoryAddress: string; fallbackHandlerAddress: string }> = {
  199: {
    safeSingletonAddress: "0x3BdD5a1E25247b1d819eD348501f7303a9b56025",
    safeProxyFactoryAddress: "0x24B30FF11223F79F3A5d9f40676D273614f55d36",
    fallbackHandlerAddress: "0xD0415ED5F5f73897e1Cc1BCc9F52A5e7338a6834",
  },
  1029: {
    safeSingletonAddress: "0x91fC153Addb1dAB12FDFBa7016CFdD24345D354b",
    safeProxyFactoryAddress: "0xa7b8d2fF03627b353694e870eA07cE21C29DccF0",
    fallbackHandlerAddress: "0x2C79A587c172c8E20B16156782C69983af126a36",
  },
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function toCopouchWallet(payload: CopouchListPayloadItem, totalValue = 0): CopouchWallet {
  return {
    id: String(payload.id ?? ""),
    walletAddress: String(payload.wallet_address ?? ""),
    walletName: String(payload.wallet_name ?? ""),
    walletType: toNumber(payload.wallet_type),
    chainName: String(payload.chain_name ?? ""),
    isCreator: Boolean(payload.is_creator),
    createdAt: String(payload.created_at ?? ""),
    updatedAt: String(payload.updated_at ?? ""),
    ownerCount: toNumber(payload.owner_count),
    status: toNumber(payload.status),
    walletBgColor: toNumber(payload.wallet_bg_color) || 1,
    ownerPreview: Array.isArray(payload.owner)
      ? payload.owner.map(item => ({
          userId: String(item.user_id ?? ""),
          walletAddress: String(item.wallet_address ?? ""),
          avatar: item.avatar ?? null,
        }))
      : [],
    totalValue,
  }
}

function sumWalletValue(coins: HomeCoin[], balances: Record<string, number>) {
  return coins.reduce((sum, coin) => {
    return sum + (balances[coin.code] ?? 0) * coin.price
  }, 0)
}

export async function getCopouchOverview(input: { chainId?: string | number | null; walletAddress?: string | null }) {
  const chainName = resolveChainNameById(input.chainId)

  const [walletsResponse, coinList, walletLimitResponse, ownerLimitResponse, finishedCountResponse, bttBalance] =
    await Promise.all([
      apiClient.get<ApiEnvelope<CopouchListPayloadItem[]>>("/api/system/member/multisig-wallet/list", {
        params: {
          chain_name: chainName,
        },
      }),
      getCoinList(chainName),
      apiClient.get<ApiEnvelope<number>>("/api/system/member/config/member-multisig-wallet-limit"),
      apiClient.get<ApiEnvelope<number>>("/api/system/member/config/member-multisig-wallet-owner-limit"),
      apiClient.get<ApiEnvelope<number>>("/api/order/member/order/finished-count"),
      getNativeBttBalance(input.chainId, input.walletAddress),
    ])

  const walletsPayload = unwrapEnvelope(walletsResponse.data)
  const wallets = await Promise.all(
    walletsPayload.map(async payload => {
      const balances = await fetchOnChainBalances({
        address: payload.wallet_address,
        chainId: input.chainId,
        coins: coinList,
      })

      return toCopouchWallet(payload, sumWalletValue(coinList, balances))
    }),
  )

  return {
    wallets,
    walletLimit: unwrapEnvelope(walletLimitResponse.data),
    ownerLimit: unwrapEnvelope(ownerLimitResponse.data),
    finishedCount: unwrapEnvelope(finishedCountResponse.data),
    bttBalance,
  } satisfies CopouchOverview
}

export async function refreshCopouchWalletBalance(input: {
  chainId?: string | number | null
  walletAddress: string
}) {
  const chainName = resolveChainNameById(input.chainId)
  const coins = await getCoinList(chainName)
  const balances = await fetchOnChainBalances({
    address: input.walletAddress,
    chainId: input.chainId,
    coins,
  })

  return sumWalletValue(coins, balances)
}

export async function getCopouchDetail(id: string) {
  const response = await apiClient.get<ApiEnvelope<CopouchDetailPayload>>(`/api/system/member/multisig-wallet/${id}`)
  const payload = unwrapEnvelope(response.data)
  const wallet = toCopouchWallet(payload)

  return {
    ...wallet,
    firstEnterStatus: toNumber(payload.first_enter_status),
    eventMessageCount: toNumber(payload.event_message_count),
  } satisfies CopouchDetail
}

export async function getCopouchOwners(id: string) {
  const response = await apiClient.get<ApiEnvelope<CopouchOwnerPayload[]>>(`/api/system/member/multisig-wallet/${id}/owners`)

  return unwrapEnvelope(response.data).map<CopouchOwner>(payload => ({
    userId: String(payload.user_id ?? ""),
    nickname: String(payload.nickname ?? ""),
    walletAddress: String(payload.wallet_address ?? ""),
    avatar: payload.avatar ?? null,
    isCreator: Boolean(payload.is_creator),
    status: toNumber(payload.status),
  }))
}

export async function preValidateCopouchCreate(input: { chainId?: string | number | null; walletName: string }) {
  const chainName = resolveChainNameById(input.chainId)

  await apiClient.post("/api/system/member/multisig-wallet/create/v2/pre-validate", {
    chain_name: chainName,
    wallet_name: input.walletName,
  })
}

export async function createCopouchWallet(input: {
  chainId?: string | number | null
  walletName: string
  walletBgColor: number
}) {
  const chainId = String(input.chainId ?? "") === "199" ? 199 : 1029
  const networkConfig = SAFE_NETWORKS[chainId]
  const walletState = useWalletStore.getState()
  const signerWallet = await resolveCreationWallet()

  if (walletState.address && signerWallet.address.toLowerCase() !== walletState.address.toLowerCase()) {
    throw new Error("walletMismatch")
  }

  const provider = getRpcProvider(chainId)
  const signer = new Wallet(signerWallet.privateKey, provider)
  const setupInterface = new Interface(SAFE_SETUP_ABI)
  const initializer = setupInterface.encodeFunctionData("setup", [
    [signer.address],
    1,
    ZeroAddress,
    "0x",
    networkConfig.fallbackHandlerAddress,
    ZeroAddress,
    0,
    ZeroAddress,
  ])
  const saltNonce = BigInt(Date.now()) + BigInt(Math.floor(Math.random() * 1_000_000))
  const proxyFactory = new Contract(networkConfig.safeProxyFactoryAddress, SAFE_PROXY_FACTORY_ABI, signer)
  const txResponse = await proxyFactory.createProxyWithNonce(networkConfig.safeSingletonAddress, initializer, saltNonce, {
    gasLimit: 300000n,
  })

  await apiClient.post("/api/system/member/multisig-wallet/create/v2", {
    chain_name: resolveChainNameById(chainId),
    tx_id: txResponse.hash,
    wallet_bg_color: input.walletBgColor,
    wallet_name: input.walletName,
  })

  return {
    txHash: txResponse.hash,
  }
}

export async function markCopouchFirstEnterSeen(id: string) {
  await apiClient.put(`/api/system/member/multisig-wallet/${id}/first-enter-status`)
}

async function getNativeBttBalance(chainId?: string | number | null, walletAddress?: string | null) {
  if (!walletAddress) {
    return 0
  }

  const provider = getRpcProvider(chainId)
  const balance = await provider.getBalance(walletAddress)
  return Number(formatUnits(balance, 18))
}

export function describeCopouchEligibilityError(error: unknown) {
  if (error instanceof ApiError) {
    switch (String(error.code ?? "")) {
      case "40004":
        return "walletLimit"
      case "40005":
        return "ownerLimit"
      case "40007":
        return "finishedCount"
      default:
        return "generic"
    }
  }

  return "generic"
}

async function resolveCreationWallet() {
  const session = useAuthStore.getState().session
  const loginType = useAuthStore.getState().loginType

  if (loginType === "passkey") {
    if (!session?.passkeyRawId) {
      throw new Error("missingPasskey")
    }

    return getLocalPasskeyWallet(session.passkeyRawId)
  }

  if (loginType === "wallet") {
    return getOrCreateLocalWallet()
  }

  throw new Error("unsupportedLoginType")
}
