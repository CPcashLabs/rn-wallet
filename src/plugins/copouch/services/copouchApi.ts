import { formatUnits } from "ethers"

import { type ApiEnvelope, unwrapEnvelope } from "@/shared/api/envelope"
import { mapWithConcurrency } from "@/shared/async/mapWithConcurrency"
import { toNumber } from "@/shared/api/normalize"
import { apiClient } from "@/shared/api/client"
import { getCoinList, resolveChainNameById, type WalletCoin } from "@/shared/api/walletAssets"
import { ApiError } from "@/shared/errors"
import { createLocalWalletUnavailableError } from "@/shared/native/localAuthVault"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { fetchOnChainBalances, getRpcProvider } from "@/shared/web3/balanceService"

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

type CopouchListEnvelope<T> = {
  data?: T[]
  total?: number
  page?: number
  per_page?: number
}

type CopouchEventPayload = {
  id?: string | number
  wallet_id?: string | number
  event_type?: string
  event_time?: number | string
  message_content?: string
  operator_avatar?: string | null
  operator_user_name?: string | null
  operator_wallet_address?: string | null
  target_user_avatar?: string | null
  target_user_name?: string | null
  target_wallet_address?: string | null
}

type CopouchBillPayload = {
  avatar?: string | null
  buyer_id?: string | number
  created_at?: number | string
  deposit_address?: string
  labels?: string[]
  nickname?: string
  order_sn?: string
  order_type?: string
  payment_address?: string
  can_allocate?: boolean
  is_first_allocate?: boolean
  reallocate_avatar?: string | null
  reallocate_buyer_id?: string | number
  reallocate_nickname?: string
  reallocate_wallet_address?: string
  receive_address?: string
  recv_actual_amount?: number | string
  recv_amount?: number | string
  recv_coin_name?: string
  recv_estimate_amount?: number | string
  refund_address?: string
  send_actual_amount?: number | string
  send_amount?: number | string
  send_coin_name?: string
  send_estimate_amount?: number | string
  send_fee_amount?: number | string
  status?: number | string
  transfer_address?: string
  wallet_address?: string
  transaction_type?: number | string
}

type CopouchMemberAccountPayload = {
  credit_amount?: number | string
  debit_amount?: number | string
  balance_amount?: number | string
  is_exit?: boolean
  is_self?: boolean
  avatar?: string | null
  nickname?: string
  member_id?: string | number
}

type CopouchOwnersIgnoreDeletePayload = {
  user_id?: string | number
  nickname?: string
  wallet_address?: string
  avatar?: string | null
  is_creator?: boolean
  status?: number | string
  deleted?: number | string
}

type CopouchReallocateInfoPayload = {
  owner_nickname?: string
  reallocate_buyer_id?: string | number
  reallocate_nickname?: string
  reallocate_wallet_address?: string
  amount?: number | string
  reallocate_avatar?: string | null
  is_first_allocate?: boolean
  transaction_type?: number | string
}

const COPOUCH_OVERVIEW_BALANCE_CONCURRENCY = 4

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

export type CopouchEvent = {
  id: string
  walletId: string
  eventType: string
  eventTime: number
  messageContent: string
  operatorAvatar: string | null
  operatorUserName: string
  operatorWalletAddress: string
  targetUserAvatar: string | null
  targetUserName: string
  targetWalletAddress: string
}

export type CopouchBillItem = {
  avatar: string | null
  buyerId: string
  createdAt: number
  depositAddress: string
  labels: string[]
  nickname: string
  orderSn: string
  orderType: string
  paymentAddress: string
  canAllocate: boolean
  isFirstAllocate: boolean
  reallocateAvatar: string | null
  reallocateBuyerId: string
  reallocateNickname: string
  reallocateWalletAddress: string
  receiveAddress: string
  recvActualAmount: number
  recvAmount: number
  recvCoinName: string
  recvEstimateAmount: number
  refundAddress: string
  sendActualAmount: number
  sendAmount: number
  sendCoinName: string
  sendEstimateAmount: number
  sendFeeAmount: number
  status: number
  transferAddress: string
  walletAddress: string
  transactionType: number
}

export type CopouchBillStatistics = {
  totalPaymentAmount: number
  totalReceivedAmount: number
}

export type CopouchMemberAccount = {
  creditAmount: number
  debitAmount: number
  balanceAmount: number
  isExit: boolean
  isSelf: boolean
  avatar: string | null
  nickname: string
  memberId: string
}

export type CopouchReallocateCandidate = {
  userId: string
  nickname: string
  walletAddress: string
  avatar: string | null
  isCreator: boolean
  status: number
  deleted: number
}

export type CopouchReallocateInfo = {
  ownerNickname: string
  reallocateBuyerId: string
  reallocateNickname: string
  reallocateWalletAddress: string
  amount: number
  reallocateAvatar: string | null
  isFirstAllocate: boolean
  transactionType: number
}

export type CopouchAssetItem = {
  coinCode: string
  coinName: string
  coinLogo: string
  price: number
  balance: number
  totalValue: number
}

function unwrapListEnvelope<T>(payload: ApiEnvelope<CopouchListEnvelope<T>> | ApiEnvelope<T[]>) {
  const data = unwrapEnvelope(payload as ApiEnvelope<CopouchListEnvelope<T>>)

  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      perPage: data.length,
    }
  }

  return {
    items: Array.isArray(data?.data) ? data.data : [],
    total: toNumber(data?.total),
    page: toNumber(data?.page) || 1,
    perPage: toNumber(data?.per_page) || 0,
  }
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

function toCopouchEvent(payload: CopouchEventPayload): CopouchEvent {
  return {
    id: String(payload.id ?? ""),
    walletId: String(payload.wallet_id ?? ""),
    eventType: String(payload.event_type ?? ""),
    eventTime: toNumber(payload.event_time),
    messageContent: String(payload.message_content ?? ""),
    operatorAvatar: payload.operator_avatar ?? null,
    operatorUserName: String(payload.operator_user_name ?? ""),
    operatorWalletAddress: String(payload.operator_wallet_address ?? ""),
    targetUserAvatar: payload.target_user_avatar ?? null,
    targetUserName: String(payload.target_user_name ?? ""),
    targetWalletAddress: String(payload.target_wallet_address ?? ""),
  }
}

function toCopouchBillItem(payload: CopouchBillPayload): CopouchBillItem {
  return {
    avatar: payload.avatar ?? null,
    buyerId: String(payload.buyer_id ?? ""),
    createdAt: toNumber(payload.created_at),
    depositAddress: String(payload.deposit_address ?? ""),
    labels: Array.isArray(payload.labels) ? payload.labels.map(label => String(label)) : [],
    nickname: String(payload.nickname ?? ""),
    orderSn: String(payload.order_sn ?? ""),
    orderType: String(payload.order_type ?? ""),
    paymentAddress: String(payload.payment_address ?? ""),
    canAllocate: Boolean(payload.can_allocate),
    isFirstAllocate: Boolean(payload.is_first_allocate),
    reallocateAvatar: payload.reallocate_avatar ?? null,
    reallocateBuyerId: String(payload.reallocate_buyer_id ?? ""),
    reallocateNickname: String(payload.reallocate_nickname ?? ""),
    reallocateWalletAddress: String(payload.reallocate_wallet_address ?? ""),
    receiveAddress: String(payload.receive_address ?? ""),
    recvActualAmount: toNumber(payload.recv_actual_amount),
    recvAmount: toNumber(payload.recv_amount),
    recvCoinName: String(payload.recv_coin_name ?? ""),
    recvEstimateAmount: toNumber(payload.recv_estimate_amount),
    refundAddress: String(payload.refund_address ?? ""),
    sendActualAmount: toNumber(payload.send_actual_amount),
    sendAmount: toNumber(payload.send_amount),
    sendCoinName: String(payload.send_coin_name ?? ""),
    sendEstimateAmount: toNumber(payload.send_estimate_amount),
    sendFeeAmount: toNumber(payload.send_fee_amount),
    status: toNumber(payload.status),
    transferAddress: String(payload.transfer_address ?? ""),
    walletAddress: String(payload.wallet_address ?? ""),
    transactionType: toNumber(payload.transaction_type),
  }
}

function toCopouchMemberAccount(payload: CopouchMemberAccountPayload): CopouchMemberAccount {
  return {
    creditAmount: toNumber(payload.credit_amount),
    debitAmount: toNumber(payload.debit_amount),
    balanceAmount: toNumber(payload.balance_amount),
    isExit: Boolean(payload.is_exit),
    isSelf: Boolean(payload.is_self),
    avatar: payload.avatar ?? null,
    nickname: String(payload.nickname ?? ""),
    memberId: String(payload.member_id ?? ""),
  }
}

function toCopouchReallocateCandidate(payload: CopouchOwnersIgnoreDeletePayload): CopouchReallocateCandidate {
  return {
    userId: String(payload.user_id ?? ""),
    nickname: String(payload.nickname ?? ""),
    walletAddress: String(payload.wallet_address ?? ""),
    avatar: payload.avatar ?? null,
    isCreator: Boolean(payload.is_creator),
    status: toNumber(payload.status),
    deleted: toNumber(payload.deleted),
  }
}

function toCopouchReallocateInfo(payload: CopouchReallocateInfoPayload): CopouchReallocateInfo {
  return {
    ownerNickname: String(payload.owner_nickname ?? ""),
    reallocateBuyerId: String(payload.reallocate_buyer_id ?? ""),
    reallocateNickname: String(payload.reallocate_nickname ?? ""),
    reallocateWalletAddress: String(payload.reallocate_wallet_address ?? ""),
    amount: toNumber(payload.amount),
    reallocateAvatar: payload.reallocate_avatar ?? null,
    isFirstAllocate: Boolean(payload.is_first_allocate),
    transactionType: toNumber(payload.transaction_type),
  }
}

function sumWalletValue(coins: WalletCoin[], balances: Record<string, number>) {
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
  const wallets = await mapWithConcurrency(walletsPayload, COPOUCH_OVERVIEW_BALANCE_CONCURRENCY, async payload => {
      const balances = await fetchOnChainBalances({
        address: payload.wallet_address,
        chainId: input.chainId,
        coins: coinList,
      })

      return toCopouchWallet(payload, sumWalletValue(coinList, balances))
    })

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
}): Promise<{ txHash: string }> {
  void input
  assertCreationLoginContext()
  throw createLocalWalletUnavailableError()
}

export async function markCopouchFirstEnterSeen(id: string) {
  await apiClient.put(`/api/system/member/multisig-wallet/${id}/first-enter-status`)
}

export async function updateCopouchWallet(
  id: string,
  input: {
    walletName?: string
    walletBgColor?: number
  },
) {
  await apiClient.put(`/api/system/member/multisig-wallet/update/${id}`, {
    wallet_name: input.walletName,
    wallet_bg_color: input.walletBgColor,
  })
}

export async function preValidateCopouchAddOwner(id: string, walletAddress: string) {
  await apiClient.post(`/api/system/member/multisig-wallet/${id}/add-owner/v2/pre-validate`, {
    wallet_address: walletAddress,
  })
}

export async function addCopouchOwner(id: string, input: { walletAddress: string; txId?: string }) {
  await apiClient.post(`/api/system/member/multisig-wallet/${id}/add-owner/v2`, {
    wallet_address: input.walletAddress,
    tx_id: input.txId,
  })
}

export async function preValidateCopouchRemoveOwner(id: string, walletAddress: string) {
  await apiClient.post(`/api/system/member/multisig-wallet/${id}/remove-owner/v2/pre-validate`, {
    wallet_address: walletAddress,
  })
}

export async function removeCopouchOwner(id: string, input: { walletAddress: string; txId?: string }) {
  await apiClient.delete(`/api/system/member/multisig-wallet/${id}/remove-owner/v2`, {
    data: {
      wallet_address: input.walletAddress,
      tx_id: input.txId,
    },
  })
}

export async function syncCopouchOwners(multisigWalletId: string) {
  await apiClient.post("/api/system/member/multisig-wallet/owners/sync", {
    multisig_wallet_id: multisigWalletId,
  })
}

export async function getCopouchWalletEvents(input: {
  walletId: string
  page?: number
  perPage?: number
}) {
  const response = await apiClient.get<ApiEnvelope<CopouchListEnvelope<CopouchEventPayload>>>(
    "/api/system/member/multisig-wallet-events",
    {
      params: {
        multisig_wallet_id: input.walletId,
        page: input.page ?? 1,
        per_page: input.perPage ?? 20,
      },
    },
  )
  const page = unwrapListEnvelope(response.data)

  return {
    items: page.items.map(toCopouchEvent),
    total: page.total,
    page: page.page,
    perPage: page.perPage,
  }
}

export async function markAllCopouchEventsRead() {
  await apiClient.put("/api/system/member/multisig-wallet-events/read-all")
}

export async function getCopouchBillList(input: {
  walletId: string
  page?: number
  perPage?: number
  orderTypeList?: string[]
  userId?: string
}) {
  const response = await apiClient.get<ApiEnvelope<CopouchListEnvelope<CopouchBillPayload>>>(
    "/api/order/member/multisig/cp-cash-page",
    {
      params: {
        multisig_wallet_id: input.walletId,
        page: input.page ?? 1,
        per_page: input.perPage ?? 20,
        order_type_list: input.orderTypeList,
        user_id: input.userId,
      },
    },
  )
  const page = unwrapListEnvelope(response.data)

  return {
    items: page.items.map(toCopouchBillItem),
    total: page.total,
    page: page.page,
    perPage: page.perPage,
  }
}

export async function getCopouchBillStatistics(input: {
  walletId: string
  orderTypeList?: string[]
  userId?: string
}) {
  const response = await apiClient.get<
    ApiEnvelope<{
      data?: {
        total_payment_amount?: number | string
        total_received_amount?: number | string
      }
    }>
  >("/api/order/member/multisig/cp-cash-statistics", {
    params: {
      multisig_wallet_id: input.walletId,
      order_type_list: input.orderTypeList,
      user_id: input.userId,
    },
  })
  const payload = unwrapEnvelope(response.data)
  const nested = payload?.data ?? {}

  return {
    totalPaymentAmount: toNumber(nested.total_payment_amount),
    totalReceivedAmount: toNumber(nested.total_received_amount),
  } satisfies CopouchBillStatistics
}

export async function exportCopouchBill(input: {
  walletId: string
  email: string
  orderType?: string
  startedAt?: string
  endedAt?: string
  startedTimestamp?: number
  endedTimestamp?: number
}) {
  const response = await apiClient.get<ApiEnvelope<boolean | string>>("/api/order/member/multisig/cp-cash-export", {
    params: {
      multisig_wallet_id: input.walletId,
      email: input.email,
      order_type: input.orderType,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      started_timestamp: input.startedTimestamp,
      ended_timestamp: input.endedTimestamp,
    },
  })

  return response.data.data
}

export async function getCopouchMemberAccountList(input: {
  walletId: string
  selectSelf?: boolean
}) {
  const response = await apiClient.get<
    ApiEnvelope<{
      member_account_item_volist?: CopouchMemberAccountPayload[]
    }>
  >("/api/order/member/multisig/member-account-list", {
    params: {
      multisig_wallet_id: input.walletId,
      select_self: input.selectSelf ?? false,
    },
  })

  const payload = unwrapEnvelope(response.data)
  return Array.isArray(payload?.member_account_item_volist) ? payload.member_account_item_volist.map(toCopouchMemberAccount) : []
}

export async function getCopouchOwnersIgnoreDelete(id: string) {
  const response = await apiClient.get<ApiEnvelope<CopouchOwnersIgnoreDeletePayload[]>>(
    `/api/system/member/multisig-wallet/${id}/ownersIgnoreDelete`,
  )

  return unwrapEnvelope(response.data).map(toCopouchReallocateCandidate)
}

export async function reallocateCopouchMember(input: {
  orderSn: string
  reallocateUserId: string
  walletId: string
  reallocateWalletAddress: string
}) {
  await apiClient.get("/api/order/member/multisig/member-account-reAllocate", {
    params: {
      order_sn: input.orderSn,
      re_allocate_user_id: input.reallocateUserId,
      multisig_wallet_id: input.walletId,
      re_allocate_wallet_address: input.reallocateWalletAddress,
    },
  })
}

export async function getCopouchReallocateInfo(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<CopouchReallocateInfoPayload>>(
    "/api/order/member/multisig/query-reallocate-info",
    {
      params: {
        order_sn: orderSn,
      },
    },
  )

  return toCopouchReallocateInfo(unwrapEnvelope(response.data))
}

export async function getCopouchAssetBreakdown(input: {
  walletId: string
  chainId?: string | number | null
}) {
  const detail = await getCopouchDetail(input.walletId)
  const chainName = detail.chainName === "BTT" || detail.chainName === "BTT_TEST" ? detail.chainName : resolveChainNameById(input.chainId)
  const coins = await getCoinList(chainName)
  const balances = await fetchOnChainBalances({
    address: detail.walletAddress,
    chainId: input.chainId,
    coins,
  })
  const assets = coins
    .map<CopouchAssetItem>(coin => ({
      coinCode: coin.code,
      coinName: coin.name,
      coinLogo: coin.logo,
      price: coin.price,
      balance: balances[coin.code] ?? 0,
      totalValue: (balances[coin.code] ?? 0) * coin.price,
    }))
    .sort((left, right) => right.totalValue - left.totalValue)

  return {
    wallet: detail,
    assets,
    totalValue: sumWalletValue(coins, balances),
  }
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

function assertCreationLoginContext() {
  const session = useAuthStore.getState().session
  const loginType = useAuthStore.getState().loginType

  if (loginType === "passkey") {
    if (!session?.passkeyRawId) {
      throw new Error("missingPasskey")
    }

    return
  }

  if (loginType === "wallet") {
    return
  }

  throw new Error("unsupportedLoginType")
}
