import { formatUnits } from "ethers"

import { getCoinList, resolveChainNameById, type HomeCoin } from "@/features/home/services/homeApi"
import { apiClient } from "@/shared/api/client"
import { ApiError } from "@/shared/errors"
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
