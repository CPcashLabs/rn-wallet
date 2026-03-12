import { apiClient } from "@/shared/api/client"
import { getCoinList, resolveChainNameById } from "@/features/home/services/homeApi"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type ReceiveAllowPairPayload = {
  recv_coin_code?: string
  recv_coin_symbol?: string
  send_coin_code?: string
  send_coin_symbol?: string
}

type ReceiveAllowPayload = {
  chain_name?: string
  chain_full_name?: string
  chain_logo?: string
  chain_color?: string
  exchange_pairs?: ReceiveAllowPairPayload[]
}

type ReceiveExchangePayload = {
  seller_id?: string | number
  send_min_amount?: number | string
  recv_min_amount?: number | string
  recv_max_amount?: number | string
  send_coin_name?: string
  send_coin_symbol?: string
}

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

type TraceShowPayload = TraceListItemPayload & {
  send_chain_name?: string
  recv_chain_name?: string
  is_rare_address?: number
}

type TraceChildPayload = {
  order_sn?: string
  status?: number | string
  status_name?: string
  amount?: number | string
  coin_name?: string
  created_at?: number | string
  from_address?: string
  txid?: string
}

type BeautifulAddressPayload = {
  address?: string
  match_tail?: string
}

type BttCheckPayload = {
  eligible?: boolean
  claim_amount?: number | string
  reason_code?: string
  threshold?: number | string
}

type ReceiveCreatePayload = {
  order_sn?: string
  serial_number?: string
}

export type ReceiveConfig = {
  payChain: string
  payChainFullName: string
  payChainColor: string
  payChainLogo: string
  sellerId: string
  sendCoinCode: string
  sendCoinSymbol: string
  recvCoinCode: string
  recvCoinSymbol: string
  receiveMinAmount: number
  receiveMaxAmount: number
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
  status: number
  statusName: string
  amount: number
  coinName: string
  createdAt: number | null
  fromAddress: string
  txid: string
}

export type RareAddressItem = {
  address: string
  matchTail: string
}

export type BttClaimStatus = {
  eligible: boolean
  claimAmount: number
  reasonCode: string
  threshold: number
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

function toTimestamp(value: unknown) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return asNumber
    }

    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
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

export async function getReceiveConfig(input: { payChain?: string; chainId?: string | number | null }) {
  const recvChainName = resolveChainNameById(input.chainId)
  const sendChainName = input.payChain || recvChainName

  const [allowListResponse, sendCoins] = await Promise.all([
    apiClient.get<ApiEnvelope<ReceiveAllowPayload[]>>("/api/seller/member/exchange/cp-cash-allow-list", {
      params: {
        group_by_type: 0,
        recv_coin_symbol: "USDT",
        send_coin_symbol: "USDT",
        recv_chain_name: recvChainName,
        send_chain_name: sendChainName,
      },
    }),
    getCoinList(sendChainName as "BTT" | "BTT_TEST"),
  ])

  const allowList = unwrapEnvelope(allowListResponse.data)
  const first = allowList[0]
  const firstPair = first?.exchange_pairs?.[0]

  if (!first || !firstPair) {
    throw new Error("receive_config_missing")
  }

  const exchangeShowResponse = await apiClient.get<ApiEnvelope<ReceiveExchangePayload>>("/api/seller/member/exchange/cp-cash-show", {
    params: {
      send_coin_code: firstPair.send_coin_code,
      recv_coin_code: firstPair.recv_coin_code,
      rate_type: 1,
    },
  })

  const exchange = unwrapEnvelope(exchangeShowResponse.data)
  const sendCoinMeta = sendCoins.find(item => item.code === firstPair.send_coin_code)

  return {
    payChain: String(first.chain_name ?? sendChainName),
    payChainFullName: String(first.chain_full_name ?? first.chain_name ?? sendChainName),
    payChainColor: String(first.chain_color ?? "#0F766E"),
    payChainLogo: String(first.chain_logo ?? ""),
    sellerId: String(exchange.seller_id ?? ""),
    sendCoinCode: String(firstPair.send_coin_code ?? ""),
    sendCoinSymbol: String(firstPair.send_coin_symbol ?? sendCoinMeta?.symbol ?? ""),
    recvCoinCode: String(firstPair.recv_coin_code ?? ""),
    recvCoinSymbol: String(firstPair.recv_coin_symbol ?? "USDT"),
    receiveMinAmount: toNumber(exchange.recv_min_amount ?? exchange.send_min_amount),
    receiveMaxAmount: toNumber(exchange.recv_max_amount),
  } satisfies ReceiveConfig
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

export async function getTraceChildLogs(input: { orderSn: string; page?: number; perPage?: number }) {
  const response = await apiClient.get<ApiEnvelope<TraceChildPayload[]>>("/api/order/member/order/trace-child-page", {
    params: {
      order_sn: input.orderSn,
      page: input.page ?? 1,
      per_page: input.perPage ?? 100,
    },
  })

  return unwrapEnvelope(response.data).map<ReceiveLog>(item => ({
    orderSn: String(item.order_sn ?? ""),
    status: toNumber(item.status),
    statusName: String(item.status_name ?? ""),
    amount: toNumber(item.amount),
    coinName: String(item.coin_name ?? ""),
    createdAt: toTimestamp(item.created_at),
    fromAddress: String(item.from_address ?? ""),
    txid: String(item.txid ?? ""),
  }))
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

export async function checkBttClaim(chainId?: string | number | null, walletAddress?: string | null) {
  const chainName = resolveChainNameById(chainId)
  const response = await apiClient.get<ApiEnvelope<BttCheckPayload>>("/api/order/member/order/btt-fee/check", {
    params: {
      wallet_address: walletAddress,
      chain_name: chainName,
    },
  })

  const payload = unwrapEnvelope(response.data)

  return {
    eligible: Boolean(payload.eligible),
    claimAmount: toNumber(payload.claim_amount),
    reasonCode: String(payload.reason_code ?? ""),
    threshold: toNumber(payload.threshold),
  } satisfies BttClaimStatus
}

export async function claimBtt(chainId?: string | number | null, walletAddress?: string | null) {
  const chainName = resolveChainNameById(chainId)
  await apiClient.get("/api/order/member/order/btt-fee/claim", {
    params: {
      wallet_address: walletAddress,
      chain_name: chainName,
    },
  })
}

export async function createNativeOrder(input: { amount: number; recvAddress: string; recvCoinCode: string }) {
  const response = await apiClient.post<ApiEnvelope<ReceiveCreatePayload>>("/api/order/member/receiving/create-native", {
    send_amount: input.amount,
    recv_address: input.recvAddress,
    recv_coin_code: input.recvCoinCode,
  })

  const payload = unwrapEnvelope(response.data)

  return {
    orderSn: String(payload.order_sn ?? payload.serial_number ?? ""),
  }
}
