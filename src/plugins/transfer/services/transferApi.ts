import axios from "axios"

import { type ApiEnvelope, unwrapEnvelope } from "@/shared/api/envelope"
import { toNumber, toTimestamp } from "@/shared/api/normalize"
import { buildOAuthTokenRequestBody } from "@/shared/api/oauth"
import { apiClient } from "@/shared/api/client"
import { normalizePinnedNetworkBaseUrl, resolveApiBaseUrl } from "@/shared/config/runtime"
export {
  getTransferChannels,
  getTransferGasEstimate,
  getTransferOrderOptions,
  getTransferQuote,
} from "@/shared/exchange/services/exchangeApi"
export type {
  TransferChannel,
  TransferGasEstimate,
  TransferOrderOption,
  TransferOrderOptions,
  TransferQuote,
} from "@/shared/exchange/services/exchangeApi"

type GuestTokenPayload = {
  access_token: string
}

type RecentTransferPayload = {
  address: string
  amount: number
  coin_name: string
  created_at: number
  direction: "TRANSFER" | "RECEIVE"
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

export type RecentTransferEntry = {
  address: string
  amount: number
  coinName: string
  createdAt: number
  direction: "TRANSFER" | "RECEIVE"
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

function normalizeBaseUrl(value?: string) {
  const baseUrl = value?.trim() || resolveApiBaseUrl()
  return normalizePinnedNetworkBaseUrl(baseUrl)
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

  const body = buildOAuthTokenRequestBody("guest")

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

function deriveShareUrl(orderSn: string) {
  return `${resolveApiBaseUrl()}/send?share=${encodeURIComponent(orderSn)}`
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

export async function checkTransferNetwork(input: { chainName: string; address: string }) {
  const response = await apiClient.get<ApiEnvelope<boolean | { matched?: boolean; supported?: boolean; chain_name?: string; current_network?: string }>>(
    "/api/order/member/order/checkCurrentNetwork",
    {
      params: {
        chain_name: input.chainName,
        address: input.address,
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
    matched: Boolean(payload?.matched ?? payload?.supported ?? false),
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
