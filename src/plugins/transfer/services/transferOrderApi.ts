import { apiClient } from "@/shared/api/client"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type BridgeAllowListPayload = {
  chain_name: string
  chain_full_name: string
  chain_logo: string
  chain_color: string
  chain_address_format_regex: string[]
  exchange_pairs: DetailedBridgeExchangePairPayload[]
}

type DetailedBridgeExchangePairPayload = {
  recv_chain_name?: string
  recv_coin_code: string
  recv_coin_contract: string
  recv_coin_full_name: string
  recv_coin_logo: string
  recv_coin_name: string
  recv_coin_precision: number
  recv_coin_symbol: string
  send_chain_name?: string
  send_coin_code: string
  send_coin_contract: string
  send_coin_full_name: string
  send_coin_logo: string
  send_coin_name: string
  send_coin_precision: number
  send_coin_symbol: string
}

type NormalAllowListPayload = {
  chain_name: string
  chain_full_name: string
  chain_logo: string
  chain_color: string
  chain_address_format_regex: string[]
  coins: NormalAllowCoinPayload[]
}

type NormalAllowCoinPayload = {
  coin_code: string
  coin_name: string
  coin_full_name: string
  coin_logo: string
  coin_contract: string
  coin_precision: number
  coin_symbol: string
  chain_name: string
  is_send_allowed: boolean
  is_recv_allowed: boolean
}

type TransferQuotePayload = {
  fee_amount: number
  fee_value: number
  rate_type: number
  recv_amount: number
  recv_chain_receipt_time: number
  recv_coin_code: string
  recv_coin_name: string
  recv_max_amount: number
  recv_min_amount: number
  recv_rate: number
  recv_value: number
  refund_address_required: boolean
  send_amount: number
  send_value: number
  send_chain_receipt_time: number
  send_coin_code: string
  send_coin_name: string
  send_max_amount: number
  send_min_amount: number
  send_rate: number
  send_estimate_receive_duration: number
  recv_estimate_receive_duration: number
  seller_id: number
}

type NormalCoinDetailPayload = {
  coin_code: string
  coin_name: string
  coin_full_name: string
  coin_logo: string
  coin_contract: string
  coin_precision: number
  coin_symbol: string
  chain_name: string
  min_amount: number
}

type CreateBridgeOrderPayload = {
  serial_number: string
  order_sn: string
  order_type: string
  status: number
  note?: string | null
}

type CreateNormalOrderPayload = {
  order_sn: string
  order_type: string
  status: number
  note?: string | null
}

type ReceivingStatusPayload = {
  exchange_pair: string
  expired_at: number
  order_sn: string
  order_type: string
  recv_amount: number
  recv_coin_code: string
  send_amount: number
  send_coin_code: string
  serial_number: string
  status: number
}

type OrderDetailPayload = {
  note: string
  recv_chain_name: string
  recv_coin_code: string
  recv_coin_name: string
  receive_address: string
  recv_amount: number
  recv_estimate_amount: number
  created_at: number
  expired_at: number | null
  order_sn: string
  order_type: string
  send_chain_name: string
  send_coin_code: string
  send_coin_contract: string
  send_coin_name: string
  send_coin_precision: number
  deposit_address: string
  send_amount: number
  status: number
  send_actual_fee_amount: number
  send_estimate_fee_amount: number
  send_fee_amount: number
  seller_estimate_receive_at: number
  multisig_wallet_id?: string | number | null
  multisig_wallet_name?: string | null
  multisig_wallet_address?: string | null
}

type CheckCurrentNetworkPayload = {
  supported: boolean
  inner_address: boolean
}

export enum TransferOrderStatus {
  BuyerPaying = 0,
  BuyerPaid = 1,
  SellerPaying = 2,
  BuyerConfirming = 3,
  OrderFinished = 4,
  BuyerPaymentBroadcasting = 5,
  OrderFrozen = -1,
  BuyerCancelled = -2,
  TimeoutClosed = -3,
  AppealClosed = -4,
  ErrorClosed = -5,
  Refunded = -6,
}

export type DetailedBridgeExchangePair = {
  recvChainName: string
  recvCoinCode: string
  recvCoinContract: string
  recvCoinFullName: string
  recvCoinLogo: string
  recvCoinName: string
  recvCoinPrecision: number
  recvCoinSymbol: string
  sendChainName: string
  sendCoinCode: string
  sendCoinContract: string
  sendCoinFullName: string
  sendCoinLogo: string
  sendCoinName: string
  sendCoinPrecision: number
  sendCoinSymbol: string
}

export type BridgeChannelDetail = {
  chainName: string
  chainFullName: string
  chainLogo: string
  chainColor: string
  addressRegexes: string[]
  exchangePairs: DetailedBridgeExchangePair[]
}

export type NormalAllowCoin = {
  coinCode: string
  coinName: string
  coinFullName: string
  coinLogo: string
  coinContract: string
  coinPrecision: number
  coinSymbol: string
  chainName: string
  isSendAllowed: boolean
  isRecvAllowed: boolean
}

export type NormalChannelDetail = {
  chainName: string
  chainFullName: string
  chainLogo: string
  chainColor: string
  addressRegexes: string[]
  coins: NormalAllowCoin[]
}

export type TransferQuote = {
  feeAmount: number
  feeValue: number
  rateType: number
  recvAmount: number
  recvCoinCode: string
  recvCoinName: string
  recvMaxAmount: number
  recvMinAmount: number
  sendAmount: number
  sendCoinCode: string
  sendCoinName: string
  sendMaxAmount: number
  sendMinAmount: number
  sendEstimateReceiveDuration: number
  recvEstimateReceiveDuration: number
  sellerId: number
}

export type NormalCoinDetail = {
  coinCode: string
  coinName: string
  coinFullName: string
  coinLogo: string
  coinContract: string
  coinPrecision: number
  coinSymbol: string
  chainName: string
  minAmount: number
}

export type CreatedBridgeOrder = {
  serialNumber: string
  orderSn: string
  orderType: string
  status: number
  note: string
}

export type CreatedNormalOrder = {
  orderSn: string
  orderType: string
  status: number
  note: string
}

export type ReceivingStatus = {
  exchangePair: string
  expiredAt: number
  orderSn: string
  orderType: string
  recvAmount: number
  recvCoinCode: string
  sendAmount: number
  sendCoinCode: string
  serialNumber: string
  status: number
}

export type TransferOrderDetail = {
  note: string
  recvChainName: string
  recvCoinCode: string
  recvCoinName: string
  receiveAddress: string
  recvAmount: number
  recvEstimateAmount: number
  createdAt: number
  expiredAt: number | null
  orderSn: string
  orderType: string
  sendChainName: string
  sendCoinCode: string
  sendCoinContract: string
  sendCoinName: string
  sendCoinPrecision: number
  depositAddress: string
  sendAmount: number
  status: TransferOrderStatus
  sendActualFeeAmount: number
  sendEstimateFeeAmount: number
  sendFeeAmount: number
  sellerEstimateReceiveAt: number
  multisigWalletId?: string | number | null
  multisigWalletName?: string | null
  multisigWalletAddress?: string | null
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

const FIXED_TRANSFER_GAS_LIMIT = 100_000

function toDetailedBridgeExchangePair(payload: DetailedBridgeExchangePairPayload, chainName: string): DetailedBridgeExchangePair {
  return {
    recvChainName: payload.recv_chain_name ?? chainName,
    recvCoinCode: payload.recv_coin_code,
    recvCoinContract: payload.recv_coin_contract,
    recvCoinFullName: payload.recv_coin_full_name,
    recvCoinLogo: payload.recv_coin_logo,
    recvCoinName: payload.recv_coin_name,
    recvCoinPrecision: payload.recv_coin_precision,
    recvCoinSymbol: payload.recv_coin_symbol,
    sendChainName: payload.send_chain_name ?? "",
    sendCoinCode: payload.send_coin_code,
    sendCoinContract: payload.send_coin_contract,
    sendCoinFullName: payload.send_coin_full_name,
    sendCoinLogo: payload.send_coin_logo,
    sendCoinName: payload.send_coin_name,
    sendCoinPrecision: payload.send_coin_precision,
    sendCoinSymbol: payload.send_coin_symbol,
  }
}

function toBridgeChannelDetail(payload: BridgeAllowListPayload): BridgeChannelDetail {
  return {
    chainName: payload.chain_name,
    chainFullName: payload.chain_full_name,
    chainLogo: payload.chain_logo,
    chainColor: payload.chain_color,
    addressRegexes: payload.chain_address_format_regex,
    exchangePairs: payload.exchange_pairs.map(item => toDetailedBridgeExchangePair(item, payload.chain_name)),
  }
}

function toNormalAllowCoin(payload: NormalAllowCoinPayload): NormalAllowCoin {
  return {
    coinCode: payload.coin_code,
    coinName: payload.coin_name,
    coinFullName: payload.coin_full_name,
    coinLogo: payload.coin_logo,
    coinContract: payload.coin_contract,
    coinPrecision: payload.coin_precision,
    coinSymbol: payload.coin_symbol,
    chainName: payload.chain_name,
    isSendAllowed: payload.is_send_allowed,
    isRecvAllowed: payload.is_recv_allowed,
  }
}

function toNormalChannelDetail(payload: NormalAllowListPayload): NormalChannelDetail {
  return {
    chainName: payload.chain_name,
    chainFullName: payload.chain_full_name,
    chainLogo: payload.chain_logo,
    chainColor: payload.chain_color,
    addressRegexes: payload.chain_address_format_regex,
    coins: payload.coins.map(toNormalAllowCoin),
  }
}

function toTransferQuote(payload: TransferQuotePayload): TransferQuote {
  return {
    feeAmount: payload.fee_amount,
    feeValue: payload.fee_value,
    rateType: payload.rate_type,
    recvAmount: payload.recv_amount,
    recvCoinCode: payload.recv_coin_code,
    recvCoinName: payload.recv_coin_name,
    recvMaxAmount: payload.recv_max_amount,
    recvMinAmount: payload.recv_min_amount,
    sendAmount: payload.send_amount,
    sendCoinCode: payload.send_coin_code,
    sendCoinName: payload.send_coin_name,
    sendMaxAmount: payload.send_max_amount,
    sendMinAmount: payload.send_min_amount,
    sendEstimateReceiveDuration: payload.send_estimate_receive_duration,
    recvEstimateReceiveDuration: payload.recv_estimate_receive_duration,
    sellerId: payload.seller_id,
  }
}

function toNormalCoinDetail(payload: NormalCoinDetailPayload): NormalCoinDetail {
  return {
    coinCode: payload.coin_code,
    coinName: payload.coin_name,
    coinFullName: payload.coin_full_name,
    coinLogo: payload.coin_logo,
    coinContract: payload.coin_contract,
    coinPrecision: payload.coin_precision,
    coinSymbol: payload.coin_symbol,
    chainName: payload.chain_name,
    minAmount: payload.min_amount,
  }
}

function toCreatedBridgeOrder(payload: CreateBridgeOrderPayload): CreatedBridgeOrder {
  return {
    serialNumber: payload.serial_number,
    orderSn: payload.order_sn,
    orderType: payload.order_type,
    status: payload.status,
    note: payload.note ?? "",
  }
}

function toCreatedNormalOrder(payload: CreateNormalOrderPayload): CreatedNormalOrder {
  return {
    orderSn: payload.order_sn,
    orderType: payload.order_type,
    status: payload.status,
    note: payload.note ?? "",
  }
}

function toReceivingStatus(payload: ReceivingStatusPayload): ReceivingStatus {
  return {
    exchangePair: payload.exchange_pair,
    expiredAt: payload.expired_at,
    orderSn: payload.order_sn,
    orderType: payload.order_type,
    recvAmount: payload.recv_amount,
    recvCoinCode: payload.recv_coin_code,
    sendAmount: payload.send_amount,
    sendCoinCode: payload.send_coin_code,
    serialNumber: payload.serial_number,
    status: payload.status,
  }
}

function toTransferOrderDetail(payload: OrderDetailPayload): TransferOrderDetail {
  return {
    note: payload.note,
    recvChainName: payload.recv_chain_name,
    recvCoinCode: payload.recv_coin_code,
    recvCoinName: payload.recv_coin_name,
    receiveAddress: payload.receive_address,
    recvAmount: payload.recv_amount,
    recvEstimateAmount: payload.recv_estimate_amount,
    createdAt: payload.created_at,
    expiredAt: payload.expired_at,
    orderSn: payload.order_sn,
    orderType: payload.order_type,
    sendChainName: payload.send_chain_name,
    sendCoinCode: payload.send_coin_code,
    sendCoinContract: payload.send_coin_contract,
    sendCoinName: payload.send_coin_name,
    sendCoinPrecision: payload.send_coin_precision,
    depositAddress: payload.deposit_address,
    sendAmount: payload.send_amount,
    status: payload.status as TransferOrderStatus,
    sendActualFeeAmount: payload.send_actual_fee_amount,
    sendEstimateFeeAmount: payload.send_estimate_fee_amount,
    sendFeeAmount: payload.send_fee_amount,
    sellerEstimateReceiveAt: payload.seller_estimate_receive_at,
    multisigWalletId: payload.multisig_wallet_id,
    multisigWalletName: payload.multisig_wallet_name,
    multisigWalletAddress: payload.multisig_wallet_address,
  }
}

export async function getBridgeChannelDetail(input: {
  sendChainName: string
  receiveChainName: string
}) {
  const response = await apiClient.get<ApiEnvelope<BridgeAllowListPayload[]>>("/api/seller/member/exchange/cp-cash-allow-list", {
    params: {
      group_by_type: 1,
      send_coin_symbol: "USDT",
      send_chain_name: input.sendChainName,
    },
  })

  const channel = unwrapEnvelope(response.data).find(item => item.chain_name === input.receiveChainName)

  if (!channel) {
    throw new Error(`Bridge channel ${input.receiveChainName} not found`)
  }

  return toBridgeChannelDetail(channel)
}

export async function getNormalChannelDetail(input: {
  chainName: string
}) {
  const response = await apiClient.get<ApiEnvelope<NormalAllowListPayload[]>>("/api/system/member/coinallow/allow-list", {
    params: {
      chain_name: input.chainName,
      is_send_allowed: true,
      is_recv_allowed: true,
    },
  })

  const channel = unwrapEnvelope(response.data).find(item => item.chain_name === input.chainName)

  if (!channel) {
    throw new Error(`Normal channel ${input.chainName} not found`)
  }

  return toNormalChannelDetail(channel)
}

export async function getTransferQuote(input: {
  sendCoinCode: string
  recvCoinCode: string
  recvAmount: number
  rateType?: 0 | 1
}) {
  const response = await apiClient.get<ApiEnvelope<TransferQuotePayload>>("/api/seller/member/exchange/cp-cash-show", {
    params: {
      send_coin_code: input.sendCoinCode,
      recv_coin_code: input.recvCoinCode,
      recv_amount: input.recvAmount,
      rate_type: input.rateType ?? 1,
    },
  })

  return toTransferQuote(unwrapEnvelope(response.data))
}

export async function getTransferGas(input: {
  chainName: string
  contractAddress: string
}) {
  void input

  return FIXED_TRANSFER_GAS_LIMIT
}

export async function getNormalCoinDetail(input: {
  coinCode: string
}) {
  const response = await apiClient.get<ApiEnvelope<NormalCoinDetailPayload>>("/api/system/member/coinallow/show", {
    params: {
      coin_code: input.coinCode,
    },
  })

  return toNormalCoinDetail(unwrapEnvelope(response.data))
}

export async function createBridgeTransferOrder(input: {
  sellerId?: number
  recvAddress: string
  recvCoinCode: string
  sendCoinCode: string
  sendAmount: number
  note: string
  multisigWalletId?: string
}) {
  const response = await apiClient.post<ApiEnvelope<CreateBridgeOrderPayload>>("/api/order/member/receiving/create-payment", {
    seller_id: input.sellerId,
    recv_address: input.recvAddress,
    recv_coin_code: input.recvCoinCode,
    send_coin_code: input.sendCoinCode,
    send_amount: input.sendAmount,
    note: input.note,
    multisig_wallet_id: input.multisigWalletId,
    pay_wallet_type: input.multisigWalletId ? "MULTISIG" : undefined,
  })

  return toCreatedBridgeOrder(unwrapEnvelope(response.data))
}

export async function createNormalTransferOrder(input: {
  coinCode: string
  amount: number
  recvAddress: string
  note: string
  multisigWalletId?: string
}) {
  const response = await apiClient.post<ApiEnvelope<CreateNormalOrderPayload>>("/api/order/member/receiving/create-payment-normal", {
    coin_code: input.coinCode,
    amount: input.amount,
    recv_address: input.recvAddress,
    note: input.note,
    multisig_wallet_id: input.multisigWalletId,
  })

  return toCreatedNormalOrder(unwrapEnvelope(response.data))
}

export async function getReceivingStatus(lookupKey: string) {
  const response = await apiClient.get<ApiEnvelope<ReceivingStatusPayload>>(`/api/order/member/receiving/show-v2/${lookupKey}`)
  return toReceivingStatus(unwrapEnvelope(response.data))
}

export async function getTransferOrderDetail(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<OrderDetailPayload>>(`/api/order/member/order/cp-cash-show/${orderSn}`)
  return toTransferOrderDetail(unwrapEnvelope(response.data))
}

export async function shipTransferOrder(input: {
  orderSn: string
  txid?: string
  success: boolean
  message?: string
}) {
  const response = await apiClient.put<ApiEnvelope<boolean>>(`/api/order/member/order/cp-cash-ship/${input.orderSn}`, {
    txid: input.txid,
    success: input.success,
    message: input.message,
  })

  return unwrapEnvelope(response.data)
}

export async function checkTransferCurrentNetwork(input: {
  chainName: string
  address: string
}) {
  const response = await apiClient.get<ApiEnvelope<CheckCurrentNetworkPayload>>("/api/order/member/order/checkCurrentNetwork", {
    params: {
      chain_name: input.chainName,
      address: input.address,
    },
  })

  return unwrapEnvelope(response.data)
}
