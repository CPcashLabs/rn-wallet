import axios from "axios"

import { apiClient } from "@/shared/api/client"
import { getCoinList, resolveChainNameById, type WalletChainName } from "@/shared/api/walletAssets"
import { resolveApiBaseUrl } from "@/shared/config/runtime"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type GuestTokenPayload = {
  access_token: string
}

type RebatePairPayload = {
  recv_coin_code: string
  send_coin_code: string
}

type BridgeAllowListPayload = {
  chain_name: string
  chain_full_name: string
  chain_logo: string
  chain_color: string
  chain_address_format_regex: string[]
  exchange_pairs: Array<{
    recv_coin_code: string
    recv_coin_symbol: string
    send_coin_code: string
    send_coin_symbol: string
  }>
}

type NormalAllowListPayload = {
  chain_name: string
  chain_full_name: string
  chain_logo: string
  chain_color: string
  chain_address_format_regex: string[]
  coins: Array<{
    coin_code: string
    coin_symbol: string
    is_send_allowed: boolean
    is_recv_allowed: boolean
  }>
}

type RecentTransferPayload = {
  address: string
  amount: number
  coin_name: string
  created_at: number
  direction: "TRANSFER" | "RECEIVE"
}

type ExchangeShowPayload = {
  chain_name?: string
  chain_full_name?: string
  chain_logo?: string
  chain_color?: string
  fee_amount?: number
  fee_value?: number
  recv_amount?: number
  recv_coin_code?: string
  recv_coin_name?: string
  send_amount?: number
  send_coin_code?: string
  send_coin_name?: string
  send_min_amount?: number
  send_max_amount?: number
  seller_id?: number | string
  exchange_pairs?: Array<{
    seller_id?: string | number
    recv_coin_code?: string
    recv_coin_symbol?: string
    send_coin_code?: string
    send_coin_symbol?: string
    fee_amount?: number
    fee_value?: number
    recv_amount?: number
    recv_estimate_amount?: number
    send_min_amount?: number
    send_coin_contract?: string
    is_exchange?: boolean
  }>
  coins?: Array<{
    coin_code?: string
    coin_symbol?: string
    fee_amount?: number
    fee_value?: number
    send_coin_contract?: string
  }>
}

type OrderShowPayload = {
  order_sn?: string
  status?: number
  status_name?: string
  order_type?: string
  receive_address?: string
  recv_address?: string
  deposit_address?: string
  recv_amount?: number
  recv_actual_amount?: number
  recv_coin_code?: string
  recv_coin_name?: string
  recv_coin_symbol?: string
  send_amount?: number
  send_actual_amount?: number
  send_coin_code?: string
  send_coin_name?: string
  send_coin_symbol?: string
  send_coin_precision?: number
  send_coin_contract?: string
  send_estimate_fee_amount?: number
  note?: string
  multisig_wallet_id?: string | number | null
  recv_chain_name?: string
  send_chain_name?: string
  seller_id?: string | number | null
  pay_url?: string
  txid?: string
  updated_at?: number | string
  created_at?: number | string
  expired_at?: number | string | null
  seller_estimate_receive_at?: number | string | null
  transfer_address?: string
  payment_address?: string
  recv_actual_received_at?: number | string | null
}

type SendShareDetailOptions = {
  publicAccess?: boolean
  publicBaseUrl?: string
}

const GUEST_ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000

let guestAccessTokenCache:
  | {
      accessToken: string
      baseUrl: string
      createdAt: number
    }
  | null = null

type ReceivingShowPayload = OrderShowPayload & {
  serial_number?: string
}

type SendSharePayload = OrderShowPayload & {
  share_url?: string
  share_link?: string
  is_payable?: boolean
  order_receipt_url?: string
  exchange_type?: number
  tx_browser_url?: string | null
  recv_address?: string | null
}

type OrderListPayload = {
  wallet_address?: string
  created_at: number
  deposit_address: string
  order_sn: string
  order_type: string
  payment_address: string
  receive_address: string
  recv_actual_amount: number
  recv_amount: number
  recv_coin_name: string
  recv_estimate_amount: number
  refund_address?: string
  send_actual_amount: string | number
  send_amount: number
  send_coin_name: string
  send_estimate_amount?: number
  status: number
  transfer_address: string | null
  avatar?: string
  labels?: string[]
}

type OrderListResponsePayload = {
  data: OrderListPayload[]
  total: number
  page: number
}

export type TransferChannel = {
  key: string
  channelType: "bridge" | "normal"
  receiveChainName: string
  receiveChainFullName: string
  receiveChainColor: string
  receiveChainLogo: string
  addressRegexes: string[]
  title: string
  subtitle: string
  isRebate: boolean
}

export type RecentTransferEntry = {
  address: string
  amount: number
  coinName: string
  createdAt: number
  direction: "TRANSFER" | "RECEIVE"
}

export type TransferOrderOption = {
  sellerId: string
  sendCoinCode: string
  sendCoinSymbol: string
  recvCoinCode: string
  recvCoinSymbol: string
  feeAmount: number
  recvEstimateAmount: number
  sendMinAmount: number
  sendCoinContract: string
}

export type TransferOrderOptions = {
  chainName: string
  chainFullName: string
  chainLogo: string
  chainColor: string
  options: TransferOrderOption[]
}

export type TransferGasEstimate = {
  gasLimit: number
}

const FIXED_TRANSFER_GAS_LIMIT = 100_000

export type TransferQuote = {
  feeAmount: number
  feeValue: number
  recvAmount: number
  recvCoinCode: string
  recvCoinName: string
  sendAmount: number
  sendCoinCode: string
  sendCoinName: string
  sendMinAmount: number
  sendMaxAmount: number
  sellerId: number
}

export type TransferOrderDetail = {
  orderSn: string
  status: number
  statusName: string
  orderType: string
  receiveAddress: string
  depositAddress: string
  recvAmount: number
  recvCoinCode: string
  recvCoinName: string
  sendAmount: number
  sendCoinCode: string
  sendCoinName: string
  sendCoinPrecision: number
  sendCoinContract: string
  sendEstimateFeeAmount: number
  note: string
  multisigWalletId: string | null
  recvChainName: string
  sendChainName: string
  sellerId: string
  payUrl: string
  txid: string
  updatedAt: number | null
  createdAt: number | null
  expiredAt: number | null
  sellerEstimateReceiveAt: number | null
  transferAddress: string
  paymentAddress: string
  recvActualAmount: number
  recvActualReceivedAt: number | null
}

export type SendShareDetail = TransferOrderDetail & {
  shareUrl: string
  isPayable: boolean
  orderReceiptUrl: string
  exchangeType: number
  txBrowserUrl: string
}

export type SendOrderLogItem = {
  orderSn: string
  orderType: string
  createdAt: number
  sendAmount: number
  sendCoinName: string
  recvAmount: number
  recvCoinName: string
  status: number
  receiveAddress: string
  paymentAddress: string
  depositAddress: string
  transferAddress: string
  recvActualAmount: number
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

function normalizeBaseUrl(value?: string) {
  const baseUrl = value?.trim() || resolveApiBaseUrl()
  return baseUrl.replace(/\/+$/, "")
}

async function requestGuestAccessToken(baseUrl?: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  if (
    guestAccessTokenCache &&
    guestAccessTokenCache.baseUrl === normalizedBaseUrl &&
    Date.now() - guestAccessTokenCache.createdAt < GUEST_ACCESS_TOKEN_TTL_MS
  ) {
    return guestAccessTokenCache.accessToken
  }

  const body = new URLSearchParams()
  body.append("client_id", "MEMBER")
  body.append("client_secret", "123456")
  body.append("grant_type", "guest")

  const client = axios.create({
    baseURL: normalizedBaseUrl,
    timeout: 15_000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
  const response = await client.post<ApiEnvelope<GuestTokenPayload> | GuestTokenPayload>("/api/auth/oauth2/token", body.toString())
  const payload = response.data
  const accessToken = "access_token" in payload ? payload.access_token : unwrapEnvelope(payload).access_token

  guestAccessTokenCache = {
    accessToken,
    baseUrl: normalizedBaseUrl,
    createdAt: Date.now(),
  }

  return accessToken
}

async function createGuestClient(baseUrl?: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const accessToken = await requestGuestAccessToken(normalizedBaseUrl)
  return axios.create({
    baseURL: normalizedBaseUrl,
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

async function getPublicSendSharePayload(orderSn: string, baseUrl?: string) {
  const client = await createGuestClient(baseUrl)
  const response = await client.get<ApiEnvelope<SendSharePayload>>(`/api/order/member/order/send-share-show-v2/${orderSn}`)
  return unwrapEnvelope(response.data)
}

async function getPublicReceiveSharePayloadByTx(txid: string, baseUrl?: string) {
  const client = await createGuestClient(baseUrl)
  const response = await client.get<ApiEnvelope<SendSharePayload>>("/api/order/member/order/receive-share-show-by-tx", {
    params: {
      send_tx_id: txid,
    },
  })
  return unwrapEnvelope(response.data)
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

function toTimestamp(value: unknown) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toOrderDetail(payload: OrderShowPayload | ReceivingShowPayload): TransferOrderDetail {
  return {
    orderSn: String(payload.order_sn ?? ""),
    status: toNumber(payload.status),
    statusName: String(payload.status_name ?? ""),
    orderType: String(payload.order_type ?? ""),
    receiveAddress: String(payload.receive_address ?? payload.recv_address ?? ""),
    depositAddress: String(payload.deposit_address ?? ""),
    recvAmount: toNumber(payload.recv_actual_amount ?? payload.recv_amount),
    recvCoinCode: String(payload.recv_coin_code ?? ""),
    recvCoinName: String(payload.recv_coin_name ?? payload.recv_coin_symbol ?? ""),
    sendAmount: toNumber(payload.send_actual_amount ?? payload.send_amount),
    sendCoinCode: String(payload.send_coin_code ?? ""),
    sendCoinName: String(payload.send_coin_name ?? payload.send_coin_symbol ?? ""),
    sendCoinPrecision: toNumber(payload.send_coin_precision),
    sendCoinContract: String(payload.send_coin_contract ?? ""),
    sendEstimateFeeAmount: toNumber(payload.send_estimate_fee_amount),
    note: String(payload.note ?? ""),
    multisigWalletId:
      payload.multisig_wallet_id === null || payload.multisig_wallet_id === undefined
        ? null
        : String(payload.multisig_wallet_id),
    recvChainName: String(payload.recv_chain_name ?? ""),
    sendChainName: String(payload.send_chain_name ?? ""),
    sellerId: payload.seller_id === null || payload.seller_id === undefined ? "" : String(payload.seller_id),
    payUrl: String(payload.pay_url ?? ""),
    txid: String(payload.txid ?? ""),
    updatedAt: toTimestamp(payload.updated_at),
    createdAt: toTimestamp(payload.created_at),
    expiredAt: toTimestamp(payload.expired_at),
    sellerEstimateReceiveAt: toTimestamp(payload.seller_estimate_receive_at),
    transferAddress: String(payload.transfer_address ?? ""),
    paymentAddress: String(payload.payment_address ?? ""),
    recvActualAmount: toNumber(payload.recv_actual_amount),
    recvActualReceivedAt: toTimestamp(payload.recv_actual_received_at),
  }
}

function toTransferQuote(payload: ExchangeShowPayload): TransferQuote {
  return {
    feeAmount: toNumber(payload.fee_amount),
    feeValue: toNumber(payload.fee_value),
    recvAmount: toNumber(payload.recv_amount),
    recvCoinCode: String(payload.recv_coin_code ?? ""),
    recvCoinName: String(payload.recv_coin_name ?? payload.recv_coin_code ?? ""),
    sendAmount: toNumber(payload.send_amount),
    sendCoinCode: String(payload.send_coin_code ?? ""),
    sendCoinName: String(payload.send_coin_name ?? payload.send_coin_code ?? ""),
    sendMinAmount: toNumber(payload.send_min_amount),
    sendMaxAmount: toNumber(payload.send_max_amount),
    sellerId: toNumber(payload.seller_id),
  }
}

function deriveShareUrl(orderSn: string) {
  return `https://share.cpcash.app/send?share=${orderSn}`
}

export async function getTransferChannels(chainId?: string | number | null, intent: "transfer" | "receive" = "transfer") {
  const sendChainName = resolveChainNameById(chainId)
  const bridgeSendChains = intent === "receive" ? Array.from(new Set([sendChainName, "BTT", "BTT_TEST"])) : [sendChainName]
  const [rebatesResult, bridgeAllowListResults, normalAllowListResult] = await Promise.all([
    getRebateExchangePairs()
      .then(data => ({ ok: true as const, data }))
      .catch(error => ({ ok: false as const, error })),
    Promise.allSettled(
      bridgeSendChains.map(sendChain =>
        apiClient.get<ApiEnvelope<BridgeAllowListPayload[]>>("/api/seller/member/exchange/cp-cash-allow-list", {
          params: {
            group_by_type: 1,
            send_coin_symbol: "USDT",
            send_chain_name: sendChain,
          },
        }),
      ),
    ),
    apiClient
      .get<ApiEnvelope<NormalAllowListPayload[]>>("/api/system/member/coinallow/allow-list", {
        params: {
          is_send_allowed: true,
          is_recv_allowed: true,
        },
      })
      .then(data => ({ ok: true as const, data }))
      .catch(error => ({ ok: false as const, error })),
  ])

  const rebates = rebatesResult.ok ? rebatesResult.data : []
  const bridgeAllowLists = bridgeAllowListResults.flatMap(result => {
    if (result.status !== "fulfilled") {
      return []
    }

    return [result.value]
  })
  const normalAllowList = normalAllowListResult.ok ? normalAllowListResult.data : null

  if (bridgeAllowLists.length === 0 && !normalAllowList?.data) {
    throw (normalAllowListResult.ok ? rebatesResult.ok ? new Error("receive_channel_unavailable") : rebatesResult.error : normalAllowListResult.error)
  }

  const rebateCoinCodes = new Set(rebates.map(item => item.recv_coin_code))
  const bridgeMap = new Map<string, TransferChannel>()

  bridgeAllowLists.flatMap(response => unwrapEnvelope(response.data)).forEach(item => {
    if (!item.chain_name || bridgeMap.has(item.chain_name)) {
      return
    }

    bridgeMap.set(item.chain_name, {
      key: `bridge:${item.chain_name}`,
      channelType: "bridge",
      receiveChainName: item.chain_name,
      receiveChainFullName: item.chain_full_name,
      receiveChainColor: item.chain_color,
      receiveChainLogo: item.chain_logo,
      addressRegexes: item.chain_address_format_regex,
      title: item.chain_name,
      subtitle: item.chain_full_name,
      isRebate: item.exchange_pairs.some(pair => rebateCoinCodes.has(pair.recv_coin_code)),
    })
  })

  const normalChannels = (normalAllowList?.data ? unwrapEnvelope(normalAllowList.data) : [])
    .filter(item => item.chain_name === sendChainName)
    .map(item => ({
      key: `normal:${item.chain_name}`,
      channelType: "normal" as const,
      receiveChainName: item.chain_name,
      receiveChainFullName: item.chain_full_name,
      receiveChainColor: item.chain_color,
      receiveChainLogo: item.chain_logo,
      addressRegexes: item.chain_address_format_regex,
      title: `CPCash ${item.chain_name}`,
      subtitle: item.chain_full_name,
      isRebate: false,
    }))

  return [...normalChannels, ...bridgeMap.values()]
}

async function getRebateExchangePairs() {
  const response = await apiClient.get<ApiEnvelope<RebatePairPayload[]>>("/api/fund/member/order-rebate-claim/list-exchange-pair")
  return unwrapEnvelope(response.data)
}

export async function getRecentTransferEntries(input: {
  sendChainName: string
  receiveChainName: string
}) {
  const response = await apiClient.get<ApiEnvelope<RecentTransferPayload[]>>(
    "/api/order/member/order/recent-transfer-receive-list",
    {
      params: {
        send_chain_name: input.sendChainName,
        recv_chain_name: input.receiveChainName,
      },
    },
  )

  return unwrapEnvelope(response.data).map<RecentTransferEntry>(item => ({
    address: item.address,
    amount: item.amount,
    coinName: item.coin_name,
    createdAt: item.created_at,
    direction: item.direction,
  }))
}

export async function getTransferOrderOptions(input: {
  sendChainName: string
  receiveChainName: string
  channelType: "bridge" | "normal"
}) {
  const [coinList, bridgeAllowList, normalAllowList] = await Promise.all([
    getCoinList(input.sendChainName as WalletChainName),
    input.channelType === "bridge"
      ? apiClient.get<ApiEnvelope<BridgeAllowListPayload[]>>("/api/seller/member/exchange/cp-cash-allow-list", {
          params: {
            group_by_type: 1,
            send_coin_symbol: "USDT",
            send_chain_name: input.sendChainName,
          },
        })
      : Promise.resolve(null),
    input.channelType === "normal"
      ? apiClient.get<ApiEnvelope<NormalAllowListPayload[]>>("/api/system/member/coinallow/allow-list", {
          params: {
            chain_name: input.sendChainName,
            is_send_allowed: true,
            is_recv_allowed: true,
          },
        })
      : Promise.resolve(null),
  ])
  const coinLookup = new Map(coinList.map(item => [item.code, item]))

  const bridgeChannel =
    bridgeAllowList?.data ? unwrapEnvelope(bridgeAllowList.data).find(item => item.chain_name === input.receiveChainName) : null
  const normalChannel =
    normalAllowList?.data ? unwrapEnvelope(normalAllowList.data).find(item => item.chain_name === input.sendChainName) : null

  const pairOptions =
    bridgeChannel?.exchange_pairs?.map<TransferOrderOption>(item => {
      const coin = coinLookup.get(String(item.send_coin_code ?? ""))

      return {
        sellerId: "",
        sendCoinCode: String(item.send_coin_code ?? ""),
        sendCoinSymbol: String(item.send_coin_symbol ?? coin?.symbol ?? item.send_coin_code ?? ""),
        recvCoinCode: String(item.recv_coin_code ?? ""),
        recvCoinSymbol: String(item.recv_coin_symbol ?? item.recv_coin_code ?? ""),
        feeAmount: 0,
        recvEstimateAmount: 0,
        sendMinAmount: 0,
        sendCoinContract: String(coin?.contract ?? ""),
      }
    }) ?? []

  const sameChainOptions =
    normalChannel?.coins
      ?.filter(item => item.is_send_allowed)
      .map<TransferOrderOption>(item => {
        const code = String(item.coin_code ?? "")
        const coin = coinLookup.get(code)

        return {
          sellerId: "",
          sendCoinCode: code,
          sendCoinSymbol: String(item.coin_symbol ?? coin?.symbol ?? code),
          recvCoinCode: "",
          recvCoinSymbol: "",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: String(coin?.contract ?? ""),
        }
      }) ?? []

  return {
    chainName: String(bridgeChannel?.chain_name ?? normalChannel?.chain_name ?? input.receiveChainName),
    chainFullName: String(bridgeChannel?.chain_full_name ?? normalChannel?.chain_full_name ?? input.receiveChainName),
    chainLogo: String(bridgeChannel?.chain_logo ?? normalChannel?.chain_logo ?? ""),
    chainColor: String(bridgeChannel?.chain_color ?? normalChannel?.chain_color ?? ""),
    options: input.channelType === "bridge" ? pairOptions : sameChainOptions,
  } satisfies TransferOrderOptions
}

export async function getTransferGasEstimate(input: { chainName: string; contractAddress: string }) {
  void input

  return {
    gasLimit: FIXED_TRANSFER_GAS_LIMIT,
  } satisfies TransferGasEstimate
}

export async function getTransferQuote(input: {
  sendCoinCode: string
  recvCoinCode: string
  recvAmount: number
  rateType?: 0 | 1
}) {
  const response = await apiClient.get<ApiEnvelope<ExchangeShowPayload>>("/api/seller/member/exchange/cp-cash-show", {
    params: {
      send_coin_code: input.sendCoinCode,
      recv_coin_code: input.recvCoinCode,
      recv_amount: input.recvAmount,
      rate_type: input.rateType ?? 1,
    },
  })

  return toTransferQuote(unwrapEnvelope(response.data))
}

export async function createPaymentOrder(input: {
  sellerId?: string
  recvCoinCode: string
  sendCoinCode: string
  sendAmount: number
  recvAddress: string
  note: string
}) {
  const response = await apiClient.post<ApiEnvelope<{ order_sn?: string; serial_number?: string }>>(
    "/api/order/member/receiving/create-payment",
    {
      seller_id: input.sellerId || undefined,
      recv_coin_code: input.recvCoinCode,
      send_coin_code: input.sendCoinCode,
      send_amount: input.sendAmount,
      recv_address: input.recvAddress,
      note: input.note,
    },
  )

  const payload = unwrapEnvelope(response.data)

  return {
    orderSn: String(payload.order_sn ?? payload.serial_number ?? ""),
  }
}

export async function createSendCodeOrder(input: {
  sellerId: string
  recvCoinCode: string
  sendCoinCode: string
  sendAmount: number
}) {
  const response = await apiClient.post<ApiEnvelope<{ order_sn?: string; serial_number?: string }>>(
    "/api/order/member/receiving/create-send-v2",
    {
      seller_id: input.sellerId,
      recv_coin_code: input.recvCoinCode,
      send_coin_code: input.sendCoinCode,
      send_amount: input.sendAmount,
    },
  )
  const payload = unwrapEnvelope(response.data)

  return {
    orderSn: String(payload.order_sn ?? payload.serial_number ?? ""),
  }
}

export async function createSendTokenOrder(input: {
  sellerId: string
  recvCoinCode: string
  sendCoinCode: string
  sendAmount: number
}) {
  const response = await apiClient.post<ApiEnvelope<{ order_sn?: string; serial_number?: string }>>(
    "/api/order/member/receiving/create-send-token-v2",
    {
      seller_id: input.sellerId,
      recv_coin_code: input.recvCoinCode,
      send_coin_code: input.sendCoinCode,
      send_amount: input.sendAmount,
    },
  )
  const payload = unwrapEnvelope(response.data)

  return {
    orderSn: String(payload.order_sn ?? payload.serial_number ?? ""),
  }
}

export async function getReceivingOrder(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<ReceivingShowPayload>>(`/api/order/member/receiving/show-v2/${orderSn}`)
  return toOrderDetail(unwrapEnvelope(response.data))
}

export async function getOrderDetail(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<OrderShowPayload>>(`/api/order/member/order/cp-cash-show/${orderSn}`)
  const data = unwrapEnvelope(response.data)
  if (data == null) {
    throw new Error("Order detail not found")
  }
  return toOrderDetail(data)
}

export async function submitShipOrder(input: {
  orderSn: string
  txid: string
  address: string
  variant?: "default" | "normal"
}) {
  const endpoint =
    input.variant === "normal"
      ? `/api/order/member/order/ship-normal/${input.orderSn}`
      : `/api/order/member/order/ship/${input.orderSn}`

  await apiClient.put(endpoint, {
    txid: input.txid,
    address: input.address,
  })
}

export async function checkTransferNetwork(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<boolean | { matched?: boolean; chain_name?: string; current_network?: string }>>(
    "/api/order/member/order/checkCurrentNetwork",
    {
      params: {
        order_sn: orderSn,
      },
    },
  )
  const payload = unwrapEnvelope(response.data)

  if (typeof payload === "boolean") {
    return {
      matched: payload,
      chainName: "",
    }
  }

  return {
    matched: Boolean(payload?.matched ?? false),
    chainName: String(payload?.chain_name ?? payload?.current_network ?? ""),
  }
}

export async function getSendShareDetail(orderSn: string, options?: SendShareDetailOptions) {
  const payload = options?.publicAccess
    ? await getPublicSendSharePayload(orderSn, options.publicBaseUrl)
    : unwrapEnvelope((await apiClient.get<ApiEnvelope<SendSharePayload>>(`/api/order/member/order/send-share-show-v2/${orderSn}`)).data)
  const detail = toOrderDetail(payload)

  return {
    ...detail,
    shareUrl: String(payload.share_url ?? payload.share_link ?? (detail.payUrl || deriveShareUrl(orderSn))),
    isPayable: Boolean(payload.is_payable ?? true),
    orderReceiptUrl: String(payload.order_receipt_url ?? ""),
    exchangeType: toNumber(payload.exchange_type),
    txBrowserUrl: String(payload.tx_browser_url ?? ""),
  } satisfies SendShareDetail
}

export async function getPublicTxStatusDetail(txid: string, baseUrl?: string) {
  const payload = await getPublicReceiveSharePayloadByTx(txid, baseUrl)
  const detail = toOrderDetail(payload)

  return {
    ...detail,
    shareUrl: String(payload.share_url ?? payload.share_link ?? ""),
    isPayable: Boolean(payload.is_payable ?? true),
    orderReceiptUrl: String(payload.order_receipt_url ?? ""),
    exchangeType: toNumber(payload.exchange_type),
    txBrowserUrl: String(payload.tx_browser_url ?? ""),
  } satisfies SendShareDetail
}

export async function updateSendReceiveAddress(input: { orderSn: string; address: string }) {
  await apiClient.put(`/api/order/member/order/recv-address/${input.orderSn}`, {
    address: input.address,
  })
}

function toSendOrderLogItem(payload: OrderListPayload): SendOrderLogItem {
  return {
    orderSn: payload.order_sn,
    orderType: payload.order_type,
    createdAt: payload.created_at,
    sendAmount: toNumber(payload.send_amount),
    sendCoinName: String(payload.send_coin_name ?? ""),
    recvAmount: toNumber(payload.recv_amount),
    recvCoinName: String(payload.recv_coin_name ?? ""),
    status: toNumber(payload.status),
    receiveAddress: String(payload.receive_address ?? ""),
    paymentAddress: String(payload.payment_address ?? ""),
    depositAddress: String(payload.deposit_address ?? ""),
    transferAddress: String(payload.transfer_address ?? ""),
    recvActualAmount: toNumber(payload.recv_actual_amount),
  }
}

export async function getSendOrderLogs(input: { page?: number; perPage?: number }) {
  const response = await apiClient.get<OrderListResponsePayload>("/api/order/member/order/cp-cash-page", {
    params: {
      page: input.page ?? 1,
      per_page: input.perPage ?? 10,
      order_type: "SEND",
    },
  })

  return {
    page: toNumber(response.data.page),
    total: toNumber(response.data.total),
    items: (response.data.data ?? []).map(toSendOrderLogItem),
  }
}
