import { type ApiEnvelope, unwrapEnvelope } from "@/shared/api/envelope"
import { toNumber, toStringValue, toTimestamp } from "@/shared/api/normalize"
import { apiClient } from "@/shared/api/client"
import { resolveRuntimeEnv } from "@/shared/config/runtime"

export {
  checkBttClaim,
  claimBtt,
  createNativeOrder,
  getReceiveConfig,
} from "@/shared/receive/services/receiveEntryApi"
export type { BttClaimStatus, ReceiveConfig } from "@/shared/receive/services/receiveEntryApi"

type TraceListItemPayload = {
  order_sn?: string
  serial_number?: string
  address?: string
  deposit_address?: string
  amount?: number | string
  coin_name?: string
  created_at?: number | string
  order_type?: string
  is_marked?: boolean
  address_remarks_name?: string | null
  expired_at?: number | string | null
}

type ReceiveSharePayload = {
  order_sn?: string
  share_url?: string
  share_link?: string
  deposit_address?: string
  send_chain_name?: string
}

type TraceShowPayload = TraceListItemPayload & {
  send_chain_name?: string
  recv_chain_name?: string
  is_rare_address?: number
}

type TraceChildPayload = {
  order_sn?: string
  serial_number?: string
  order_type?: string
  status?: number | string
  status_name?: string
  amount?: number | string
  recv_amount?: number | string
  recv_actual_amount?: number | string
  coin_name?: string
  recv_coin_name?: string
  recv_coin_symbol?: string
  send_coin_name?: string
  created_at?: number | string
  from_address?: string
  payment_address?: string
  address?: string
  txid?: string
  send_tx_id?: string
}

type TraceStatisticsPayload = {
  receipt_amount?: number | string
  order_count?: number | string
  send_actual_fee_amount?: number | string
  recv_actual_amount?: number | string
  recv_amount?: number | string
  amount?: number | string
  fee_amount?: number | string
  actual_amount?: number | string
}

type BeautifulAddressPayload = {
  address?: string
  match_tail?: string
}

type ReceiveCreatePayload = {
  order_sn?: string
  serial_number?: string
}

type ExpireOptionPayload = {
  expire_duration?: number | string
  system_default?: boolean
  user_marked?: boolean
}

export type ReceiveOrder = {
  orderSn: string
  serialNumber: string
  address: string
  amount: number
  coinName: string
  createdAt: number | null
  orderType: "TRACE" | "TRACE_LONG_TERM" | "TRACE_CHILD" | "UNKNOWN"
  isMarked: boolean
  remarkName: string
  expiredAt: number | null
  sendChainName: string
  recvChainName: string
  isRareAddress: boolean
}

export type ReceiveLog = {
  orderSn: string
  orderType: "TRACE" | "TRACE_LONG_TERM" | "TRACE_CHILD" | "UNKNOWN"
  status: number
  statusName: string
  amount: number
  receiptAmount: number
  recvActualAmount: number
  feeAmount: number
  coinName: string
  createdAt: number | null
  fromAddress: string
  txid: string
}

export type ReceiveTraceStatistics = {
  receiptAmount: number
  orderCount: number
  sendActualFeeAmount: number
  recvActualAmount: number
}

export type RareAddressItem = {
  address: string
  matchTail: string
}

export type ReceiveShareDetail = {
  orderSn: string
  shareUrl: string
  address: string
  sendChainName: string
}

export type ReceiveExpireOption = {
  expireDuration: number
  systemDefault: boolean
  userMarked: boolean
}

function toReceiveOrder(payload: TraceListItemPayload | TraceShowPayload): ReceiveOrder {
  const address = String(payload.deposit_address ?? payload.address ?? "")
  const orderType = String(payload.order_type ?? "")

  return {
    orderSn: String(payload.order_sn ?? ""),
    serialNumber: String(payload.serial_number ?? payload.order_sn ?? ""),
    address,
    amount: toNumber(payload.amount),
    coinName: String(payload.coin_name ?? ""),
    createdAt: toTimestamp(payload.created_at),
    orderType:
      orderType === "TRACE" || orderType === "TRACE_LONG_TERM" || orderType === "TRACE_CHILD" ? orderType : "UNKNOWN",
    isMarked: Boolean(payload.is_marked),
    remarkName: String(payload.address_remarks_name ?? ""),
    expiredAt: toTimestamp(payload.expired_at),
    sendChainName: String((payload as TraceShowPayload).send_chain_name ?? ""),
    recvChainName: String((payload as TraceShowPayload).recv_chain_name ?? ""),
    isRareAddress: toNumber((payload as TraceShowPayload).is_rare_address) === 1,
  }
}

export async function getRecentReceiveOrders(input: {
  orderType: "TRACE" | "TRACE_LONG_TERM"
  sendCoinCode: string
  recvCoinCode: string
  multisigWalletId?: string
}) {
  const response = await apiClient.get<ApiEnvelope<TraceListItemPayload[]>>("/api/order/member/order/recent-valid-trace-page", {
    params: {
      page: 1,
      per_page: 100,
      order_type: input.orderType,
      send_coin_code: input.sendCoinCode,
      recv_coin_code: input.recvCoinCode,
      multisig_wallet_id: input.multisigWalletId,
    },
  })

  return unwrapEnvelope(response.data).map(toReceiveOrder)
}

export async function getInvalidReceiveOrders(input: {
  sendCoinCode?: string
  recvCoinCode?: string
  multisigWalletId?: string
}) {
  const response = await apiClient.get<ApiEnvelope<TraceListItemPayload[]>>("/api/order/member/order/recent-invalid-trace-page", {
    params: {
      page: 1,
      per_page: 100,
      send_coin_code: input.sendCoinCode,
      recv_coin_code: input.recvCoinCode,
      multisig_wallet_id: input.multisigWalletId,
    },
  })

  return unwrapEnvelope(response.data).map(toReceiveOrder)
}

export async function getReceiveAddressLimit(input: {
  orderType: "TRACE" | "TRACE_LONG_TERM"
  sendCoinCode: string
  recvCoinCode: string
  multisigWalletId?: string
}) {
  const response = await apiClient.get<ApiEnvelope<number>>("/api/order/member/order-limit/limit-count", {
    params: {
      order_type: input.orderType,
      send_coin_code: input.sendCoinCode,
      recv_coin_code: input.recvCoinCode,
      multisig_wallet_id: input.multisigWalletId,
    },
  })

  return toNumber(unwrapEnvelope(response.data))
}

export async function createReceiveOrder(input: {
  variant: "short" | "long"
  sellerId: string
  recvAmount: number
  recvAddress: string
  sendCoinCode: string
  recvCoinCode: string
  multisigWalletId?: string
}) {
  const endpoint =
    input.variant === "short"
      ? "/api/order/member/receiving/create-trace-v2"
      : "/api/order/member/receiving/create-trace-long-term-v2"

  const response = await apiClient.post<ApiEnvelope<ReceiveCreatePayload>>(endpoint, {
    seller_id: input.sellerId,
    recv_amount: input.recvAmount,
    recv_address: input.recvAddress,
    send_coin_code: input.sendCoinCode,
    recv_coin_code: input.recvCoinCode,
    multisig_wallet_id: input.multisigWalletId,
    env: resolveRuntimeEnv(),
  })

  const payload = unwrapEnvelope(response.data)

  return {
    orderSn: String(payload.order_sn ?? ""),
    serialNumber: String(payload.serial_number ?? payload.order_sn ?? ""),
  }
}

export async function getReceivingOrderStatus(orderSnOrSerial: string) {
  const response = await apiClient.get<ApiEnvelope<TraceShowPayload>>(`/api/order/member/receiving/show-v2/${orderSnOrSerial}`)
  return toReceiveOrder(unwrapEnvelope(response.data))
}

export async function getTraceDetail(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<TraceShowPayload>>(`/api/order/member/order/trace-show/${orderSn}`)
  return toReceiveOrder(unwrapEnvelope(response.data))
}

export async function getReceiveShareDetail(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<ReceiveSharePayload>>(`/api/order/member/order/receive-share-show-v2/${orderSn}`)
  const payload = unwrapEnvelope(response.data)

  return {
    orderSn: String(payload.order_sn ?? orderSn),
    shareUrl: String(payload.share_url ?? payload.share_link ?? ""),
    address: String(payload.deposit_address ?? ""),
    sendChainName: String(payload.send_chain_name ?? ""),
  } satisfies ReceiveShareDetail
}

export async function getTraceChildLogs(input: { orderSn: string; page?: number; perPage?: number }) {
  const response = await apiClient.get<ApiEnvelope<TraceChildPayload[]>>("/api/order/member/order/trace-child-page", {
    params: {
      order_sn: input.orderSn,
      page: input.page ?? 1,
      per_page: input.perPage ?? 100,
    },
  })

  return unwrapEnvelope(response.data)
    .map<ReceiveLog>(item => {
      const receiptAmount = toNumber(item.recv_amount ?? item.amount ?? item.recv_actual_amount)
      const recvActualAmount = toNumber(item.recv_actual_amount ?? item.recv_amount ?? item.amount)

      return {
        orderSn: toStringValue(item.order_sn ?? item.serial_number),
        orderType:
          item.order_type === "TRACE" || item.order_type === "TRACE_LONG_TERM" || item.order_type === "TRACE_CHILD"
            ? item.order_type
            : "UNKNOWN",
        status: toNumber(item.status),
        statusName: toStringValue(item.status_name),
        amount: recvActualAmount,
        receiptAmount,
        recvActualAmount,
        feeAmount: Math.max(0, Number((receiptAmount - recvActualAmount).toFixed(6))),
        coinName: toStringValue(item.recv_coin_name ?? item.recv_coin_symbol ?? item.coin_name ?? item.send_coin_name),
        createdAt: toTimestamp(item.created_at),
        fromAddress: toStringValue(item.payment_address ?? item.from_address ?? item.address),
        txid: toStringValue(item.txid ?? item.send_tx_id),
      }
    })
    .sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))
}

export async function getTraceChildStatistics(input: { orderSn: string }) {
  const response = await apiClient.get<ApiEnvelope<TraceStatisticsPayload>>("/api/order/member/order/trace-child-statistics", {
    params: {
      order_sn: input.orderSn,
    },
  })

  const payload = unwrapEnvelope(response.data)

  return {
    receiptAmount: toNumber(payload.receipt_amount ?? payload.recv_amount ?? payload.amount),
    orderCount: toNumber(payload.order_count),
    sendActualFeeAmount: toNumber(payload.send_actual_fee_amount ?? payload.fee_amount),
    recvActualAmount: toNumber(payload.recv_actual_amount ?? payload.actual_amount ?? payload.recv_amount),
  } satisfies ReceiveTraceStatistics
}

export async function getRareAddressPage(input: {
  chainName: string
  digit: number
  type: "digit" | "letter"
  page?: number
  perPage?: number
}) {
  const response = await apiClient.get<ApiEnvelope<{ data?: BeautifulAddressPayload[] } | BeautifulAddressPayload[]>>(
    "/api/order/member/orderAddressInfo/beautifulAddress/page",
    {
      params: {
        chain_name: input.chainName,
        digit: input.digit,
        type: input.type,
        page: input.page ?? 1,
        per_page: input.perPage ?? 30,
      },
    },
  )

  const payload = unwrapEnvelope(response.data)
  const list = Array.isArray(payload) ? payload : payload.data ?? []

  return list.map<RareAddressItem>(item => ({
    address: String(item.address ?? ""),
    matchTail: String(item.match_tail ?? ""),
  }))
}

export async function editReceiveAddressRemark(input: {
  orderSn: string
  remarkName: string
  address: string
  multisigWalletId?: string
}) {
  const endpoint = input.multisigWalletId
    ? "/api/order/member/orderAddressInfo/editMultisigAddressInfo"
    : "/api/order/member/orderAddressInfo/editAddressInfo"

  await apiClient.post(endpoint, {
    order_sn: input.orderSn,
    remark_name: input.remarkName,
    address: input.address,
    multisig_wallet_id: input.multisigWalletId,
  })
}

export async function batchExpireReceiveOrders(input: {
  orderSnList: string[]
}) {
  await apiClient.post("/api/order/member/order/batch-expire", {
    order_sn_list: input.orderSnList,
  })
}

export async function getReceiveExpireOptions() {
  const response = await apiClient.get<ApiEnvelope<ExpireOptionPayload[]>>(
    "/api/system/member/config/trace-order-expire-duration-collection",
  )

  return unwrapEnvelope(response.data).map<ReceiveExpireOption>(item => ({
    expireDuration: toNumber(item.expire_duration),
    systemDefault: Boolean(item.system_default),
    userMarked: Boolean(item.user_marked),
  }))
}

export async function markReceiveExpireDuration(input: { expireDuration: number; multisigWalletId?: string }) {
  const params = new URLSearchParams()
  params.append("expire_duration", String(input.expireDuration))

  if (input.multisigWalletId) {
    params.append("multisig_wallet_id", input.multisigWalletId)
  }

  await apiClient.post("/api/system/member/config/trace-order-expire-duration-mark", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
}
