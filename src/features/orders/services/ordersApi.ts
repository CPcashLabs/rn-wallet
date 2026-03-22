import { type ApiEnvelope } from "@/shared/api/envelope"
import { toNumber, toStringValue, toTimestamp } from "@/shared/api/normalize"
import { apiClient } from "@/shared/api/client"
import { buildImageUploadFormDataPart, type UploadableImage } from "@/shared/api/uploadFile"

type PagedApiEnvelope<T> = ApiEnvelope<T[]> & {
  total?: number
  page?: number
  per_page?: number
  other_address?: string
}

type OrderListItemPayload = {
  wallet_address?: string
  created_at?: number | string
  deposit_address?: string
  order_sn?: string
  order_type?: string
  payment_address?: string
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
  status?: number | string
  transfer_address?: string | null
  avatar?: string
  labels?: string[]
}

type OrderStatisticsPayload = {
  receipt_amount?: number | string
  payment_amount?: number | string
  fee?: number | string
  transactions?: number | string
}

type ExplorerLinkPayload = {
  address_url?: string
  logo?: string
  tx_id_url?: string
  url?: string
}

type OrderDetailPayload = {
  note?: string
  recv_chain_name?: string
  recv_chain_logo?: string
  recv_coin_code?: string
  recv_chain_browsers?: ExplorerLinkPayload[]
  send_chain_browsers?: ExplorerLinkPayload[]
  recv_coin_contract?: string
  recv_coin_logo?: string
  recv_coin_name?: string
  buyer_email?: string
  buyer_estimate_receive_at?: number | string
  recv_actual_amount?: number | string
  recv_actual_received_at?: number | string
  receive_address?: string
  buyer_refund_address?: string
  payment_address?: string
  recv_amount?: number | string
  created_at?: number | string
  recv_estimate_amount?: number | string
  send_estimate_amount?: number | string
  expired_at?: number | string | null
  finished_at?: number | string | null
  order_sn?: string
  order_type?: string
  seller_chain_browsers?: ExplorerLinkPayload[]
  send_chain_name?: string
  send_coin_code?: string
  send_coin_contract?: string
  send_coin_logo?: string
  send_coin_name?: string
  send_coin_precision?: number | string
  seller_estimate_receive_at?: number | string
  send_actual_amount?: number | string
  send_actual_received_at?: number | string | null
  deposit_address?: string
  transfer_address?: string
  send_amount?: number | string
  status?: number | string
  status_name?: string
  send_actual_fee_amount?: number | string
  send_estimate_fee_amount?: number | string
  send_fee_amount?: number | string
  multisig_wallet_id?: string | number | null
  multisig_wallet_name?: string | null
  multisig_wallet_address?: string | null
  is_buyer?: boolean
  notes_image_url?: string | null
  txid?: string
}

type TransferVoucherPayload = {
  order_sn?: string
  order_type?: string
  order_receipt_url?: string
  exchange_type?: number | string
  created_at?: number | string
  expired_at?: number | string | null
  recv_address?: string | null
  recv_chain_name?: string
  recv_coin_code?: string
  recv_coin_contract?: string
  recv_coin_name?: string
  recv_amount?: number | string
  status?: number | string
  tx_browser_url?: string | null
  transfer_address?: string
  recv_actual_received_at?: number | string
  payment_address?: string
  send_amount?: number | string
  send_coin_name?: string
  send_fee_amount?: number | string
}

type RefundDetailPayload = {
  amount?: number | string
  refund_coin_name?: string
  refund_address?: string
  refund_chain_name?: string
  refund_at?: number | string
  refund_txid_url?: string
  refund_txid?: string
}

type OrderBillAddressPayload = {
  adversary_address?: string
  payment_amount?: number | string
  receipt_amount?: number | string
  avatar?: string
}

type BillDetailPayload = {
  order_sn?: string
  order_type?: string
  created_at?: number | string
  payment_address?: string
  receive_address?: string
  deposit_address?: string
  transfer_address?: string
  send_amount?: number | string
  send_coin_name?: string
  recv_amount?: number | string
  recv_actual_amount?: number | string
  recv_coin_name?: string
  send_fee_amount?: number | string
  send_actual_fee_amount?: number | string
  note?: string
  status?: number | string
}

type CategoryLabelPayload = {
  category_label_id?: number | string
  label_name?: string
  remark?: string
}

type BoundOrderLabelPayload = {
  notes?: string
  notes_image_url?: string | null
  member_order_label_item_volist?: Array<{
    category_label_id?: number | string
    label_name?: string
  }>
}

type UploadFilePayload = {
  url?: string
  file_url?: string
  full_url?: string
  path?: string
}

export type OrderListItem = {
  walletAddress: string
  createdAt: number | null
  depositAddress: string
  orderSn: string
  orderType: string
  paymentAddress: string
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
  status: number
  transferAddress: string
  avatar: string
  labels: string[]
}

export type OrderStatistics = {
  receiptAmount: number
  paymentAmount: number
  fee: number
  transactions: number
}

export type ExplorerLink = {
  addressUrl: string
  logo: string
  txIdUrl: string
  url: string
}

export type OrderDetail = {
  note: string
  recvChainName: string
  recvChainLogo: string
  recvCoinCode: string
  recvChainBrowsers: ExplorerLink[]
  sendChainBrowsers: ExplorerLink[]
  recvCoinContract: string
  recvCoinLogo: string
  recvCoinName: string
  buyerEmail: string
  buyerEstimateReceiveAt: number | null
  recvActualAmount: number
  recvActualReceivedAt: number | null
  receiveAddress: string
  buyerRefundAddress: string
  paymentAddress: string
  recvAmount: number
  createdAt: number | null
  recvEstimateAmount: number
  sendEstimateAmount: number
  expiredAt: number | null
  finishedAt: number | null
  orderSn: string
  orderType: string
  sellerChainBrowsers: ExplorerLink[]
  sendChainName: string
  sendCoinCode: string
  sendCoinContract: string
  sendCoinLogo: string
  sendCoinName: string
  sendCoinPrecision: number
  sellerEstimateReceiveAt: number | null
  sendActualAmount: number
  sendActualReceivedAt: number | null
  depositAddress: string
  transferAddress: string
  sendAmount: number
  status: number
  statusName: string
  sendActualFeeAmount: number
  sendEstimateFeeAmount: number
  sendFeeAmount: number
  multisigWalletId: string | null
  multisigWalletName: string
  multisigWalletAddress: string
  isBuyer: boolean
  notesImageUrl: string
  txid: string
}

export type TransferVoucherDetail = {
  orderSn: string
  orderType: string
  orderReceiptUrl: string
  exchangeType: number
  createdAt: number | null
  expiredAt: number | null
  recvAddress: string
  recvChainName: string
  recvCoinCode: string
  recvCoinContract: string
  recvCoinName: string
  recvAmount: number
  status: number
  txBrowserUrl: string
  transferAddress: string
  recvActualReceivedAt: number | null
  paymentAddress: string
  sendAmount: number
  sendCoinName: string
  sendFeeAmount: number
}

export type RefundDetail = {
  amount: number
  refundCoinName: string
  refundAddress: string
  refundChainName: string
  refundAt: number | null
  refundTxidUrl: string
  refundTxid: string
}

export type OrderBillAddressItem = {
  address: string
  paymentAmount: number
  receiptAmount: number
  avatar: string
}

export type BillDetail = {
  orderSn: string
  orderType: string
  createdAt: number | null
  paymentAddress: string
  receiveAddress: string
  depositAddress: string
  transferAddress: string
  sendAmount: number
  sendCoinName: string
  recvAmount: number
  recvActualAmount: number
  recvCoinName: string
  feeAmount: number
  note: string
  status: number
}

export type CategoryLabel = {
  id: string
  name: string
  remark: string
}

export type OrderLabelBinding = {
  notes: string
  notesImageUrl: string
  labels: CategoryLabel[]
}

export type RangeQuery = {
  startedAt?: string
  endedAt?: string
  startedTimestamp?: number
  endedTimestamp?: number
}

export type OrderTypeFilter = "RECEIPT" | "PAYMENT" | "SEND" | "SEND_TOKEN" | "NATIVE"

function serializeParams(params: Record<string, unknown>) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return
    }

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== null && item !== undefined && item !== "") {
          search.append(key, String(item))
        }
      })
      return
    }

    search.append(key, String(value))
  })

  return search.toString()
}

function toExplorerLink(payload: ExplorerLinkPayload): ExplorerLink {
  return {
    addressUrl: toStringValue(payload.address_url),
    logo: toStringValue(payload.logo),
    txIdUrl: toStringValue(payload.tx_id_url),
    url: toStringValue(payload.url),
  }
}

function toOrderListItem(payload: OrderListItemPayload): OrderListItem {
  return {
    walletAddress: toStringValue(payload.wallet_address),
    createdAt: toTimestamp(payload.created_at),
    depositAddress: toStringValue(payload.deposit_address),
    orderSn: toStringValue(payload.order_sn),
    orderType: toStringValue(payload.order_type),
    paymentAddress: toStringValue(payload.payment_address),
    receiveAddress: toStringValue(payload.receive_address),
    recvActualAmount: toNumber(payload.recv_actual_amount),
    recvAmount: toNumber(payload.recv_amount),
    recvCoinName: toStringValue(payload.recv_coin_name),
    recvEstimateAmount: toNumber(payload.recv_estimate_amount),
    refundAddress: toStringValue(payload.refund_address),
    sendActualAmount: toNumber(payload.send_actual_amount),
    sendAmount: toNumber(payload.send_amount),
    sendCoinName: toStringValue(payload.send_coin_name),
    sendEstimateAmount: toNumber(payload.send_estimate_amount),
    status: toNumber(payload.status),
    transferAddress: toStringValue(payload.transfer_address),
    avatar: toStringValue(payload.avatar),
    labels: Array.isArray(payload.labels) ? payload.labels.map(item => String(item)) : [],
  }
}

function toOrderStatistics(payload?: OrderStatisticsPayload | null): OrderStatistics {
  return {
    receiptAmount: toNumber(payload?.receipt_amount),
    paymentAmount: toNumber(payload?.payment_amount),
    fee: toNumber(payload?.fee),
    transactions: toNumber(payload?.transactions),
  }
}

function toOrderDetail(payload: OrderDetailPayload): OrderDetail {
  return {
    note: toStringValue(payload.note),
    recvChainName: toStringValue(payload.recv_chain_name),
    recvChainLogo: toStringValue(payload.recv_chain_logo),
    recvCoinCode: toStringValue(payload.recv_coin_code),
    recvChainBrowsers: Array.isArray(payload.recv_chain_browsers) ? payload.recv_chain_browsers.map(toExplorerLink) : [],
    sendChainBrowsers: Array.isArray(payload.send_chain_browsers) ? payload.send_chain_browsers.map(toExplorerLink) : [],
    recvCoinContract: toStringValue(payload.recv_coin_contract),
    recvCoinLogo: toStringValue(payload.recv_coin_logo),
    recvCoinName: toStringValue(payload.recv_coin_name),
    buyerEmail: toStringValue(payload.buyer_email),
    buyerEstimateReceiveAt: toTimestamp(payload.buyer_estimate_receive_at),
    recvActualAmount: toNumber(payload.recv_actual_amount),
    recvActualReceivedAt: toTimestamp(payload.recv_actual_received_at),
    receiveAddress: toStringValue(payload.receive_address),
    buyerRefundAddress: toStringValue(payload.buyer_refund_address),
    paymentAddress: toStringValue(payload.payment_address),
    recvAmount: toNumber(payload.recv_amount),
    createdAt: toTimestamp(payload.created_at),
    recvEstimateAmount: toNumber(payload.recv_estimate_amount),
    sendEstimateAmount: toNumber(payload.send_estimate_amount),
    expiredAt: toTimestamp(payload.expired_at),
    finishedAt: toTimestamp(payload.finished_at),
    orderSn: toStringValue(payload.order_sn),
    orderType: toStringValue(payload.order_type),
    sellerChainBrowsers: Array.isArray(payload.seller_chain_browsers) ? payload.seller_chain_browsers.map(toExplorerLink) : [],
    sendChainName: toStringValue(payload.send_chain_name),
    sendCoinCode: toStringValue(payload.send_coin_code),
    sendCoinContract: toStringValue(payload.send_coin_contract),
    sendCoinLogo: toStringValue(payload.send_coin_logo),
    sendCoinName: toStringValue(payload.send_coin_name),
    sendCoinPrecision: toNumber(payload.send_coin_precision),
    sellerEstimateReceiveAt: toTimestamp(payload.seller_estimate_receive_at),
    sendActualAmount: toNumber(payload.send_actual_amount),
    sendActualReceivedAt: toTimestamp(payload.send_actual_received_at),
    depositAddress: toStringValue(payload.deposit_address),
    transferAddress: toStringValue(payload.transfer_address),
    sendAmount: toNumber(payload.send_amount),
    status: toNumber(payload.status),
    statusName: toStringValue(payload.status_name),
    sendActualFeeAmount: toNumber(payload.send_actual_fee_amount),
    sendEstimateFeeAmount: toNumber(payload.send_estimate_fee_amount),
    sendFeeAmount: toNumber(payload.send_fee_amount),
    multisigWalletId:
      payload.multisig_wallet_id === null || payload.multisig_wallet_id === undefined
        ? null
        : String(payload.multisig_wallet_id),
    multisigWalletName: toStringValue(payload.multisig_wallet_name),
    multisigWalletAddress: toStringValue(payload.multisig_wallet_address),
    isBuyer: Boolean(payload.is_buyer),
    notesImageUrl: toStringValue(payload.notes_image_url),
    txid: toStringValue(payload.txid),
  }
}

function toTransferVoucherDetail(payload: TransferVoucherPayload): TransferVoucherDetail {
  return {
    orderSn: toStringValue(payload.order_sn),
    orderType: toStringValue(payload.order_type),
    orderReceiptUrl: toStringValue(payload.order_receipt_url),
    exchangeType: toNumber(payload.exchange_type),
    createdAt: toTimestamp(payload.created_at),
    expiredAt: toTimestamp(payload.expired_at),
    recvAddress: toStringValue(payload.recv_address),
    recvChainName: toStringValue(payload.recv_chain_name),
    recvCoinCode: toStringValue(payload.recv_coin_code),
    recvCoinContract: toStringValue(payload.recv_coin_contract),
    recvCoinName: toStringValue(payload.recv_coin_name),
    recvAmount: toNumber(payload.recv_amount),
    status: toNumber(payload.status),
    txBrowserUrl: toStringValue(payload.tx_browser_url),
    transferAddress: toStringValue(payload.transfer_address),
    recvActualReceivedAt: toTimestamp(payload.recv_actual_received_at),
    paymentAddress: toStringValue(payload.payment_address),
    sendAmount: toNumber(payload.send_amount),
    sendCoinName: toStringValue(payload.send_coin_name),
    sendFeeAmount: toNumber(payload.send_fee_amount),
  }
}

function toRefundDetail(payload?: RefundDetailPayload | null): RefundDetail {
  return {
    amount: toNumber(payload?.amount),
    refundCoinName: toStringValue(payload?.refund_coin_name),
    refundAddress: toStringValue(payload?.refund_address),
    refundChainName: toStringValue(payload?.refund_chain_name),
    refundAt: toTimestamp(payload?.refund_at),
    refundTxidUrl: toStringValue(payload?.refund_txid_url),
    refundTxid: toStringValue(payload?.refund_txid),
  }
}

function toOrderBillAddressItem(payload: OrderBillAddressPayload): OrderBillAddressItem {
  return {
    address: toStringValue(payload.adversary_address),
    paymentAmount: toNumber(payload.payment_amount),
    receiptAmount: toNumber(payload.receipt_amount),
    avatar: toStringValue(payload.avatar),
  }
}

function toBillDetail(payload?: BillDetailPayload | null): BillDetail {
  return {
    orderSn: toStringValue(payload?.order_sn),
    orderType: toStringValue(payload?.order_type),
    createdAt: toTimestamp(payload?.created_at),
    paymentAddress: toStringValue(payload?.payment_address),
    receiveAddress: toStringValue(payload?.receive_address),
    depositAddress: toStringValue(payload?.deposit_address),
    transferAddress: toStringValue(payload?.transfer_address),
    sendAmount: toNumber(payload?.send_amount),
    sendCoinName: toStringValue(payload?.send_coin_name),
    recvAmount: toNumber(payload?.recv_amount),
    recvActualAmount: toNumber(payload?.recv_actual_amount),
    recvCoinName: toStringValue(payload?.recv_coin_name),
    feeAmount: toNumber(payload?.send_actual_fee_amount ?? payload?.send_fee_amount),
    note: toStringValue(payload?.note),
    status: toNumber(payload?.status),
  }
}

function toCategoryLabel(payload?: CategoryLabelPayload | null): CategoryLabel {
  return {
    id: toStringValue(payload?.category_label_id),
    name: toStringValue(payload?.label_name),
    remark: toStringValue(payload?.remark),
  }
}

function resolveUploadedFileUrl(payload?: UploadFilePayload | null) {
  return (
    toStringValue(payload?.full_url) ||
    toStringValue(payload?.url) ||
    toStringValue(payload?.file_url) ||
    toStringValue(payload?.path)
  )
}

export async function getOrderTxlogs(input: {
  page?: number
  perPage?: number
  orderType?: OrderTypeFilter
  otherAddress?: string
} & RangeQuery) {
  const endpoint = input.otherAddress
    ? "/api/order/member/order/cp-cash-page/special-Address"
    : "/api/order/member/order/cp-cash-page"

  const response = await apiClient.get<PagedApiEnvelope<OrderListItemPayload>>(endpoint, {
    params: {
      page: input.page ?? 1,
      per_page: input.perPage ?? 20,
      order_type: input.orderType,
      other_address: input.otherAddress,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      started_timestamp: input.startedTimestamp,
      ended_timestamp: input.endedTimestamp,
    },
    paramsSerializer: params => serializeParams(params as Record<string, unknown>),
  })

  return {
    data: Array.isArray(response.data.data) ? response.data.data.map(toOrderListItem) : [],
    total: toNumber(response.data.total),
    page: toNumber(response.data.page) || (input.page ?? 1),
    otherAddress: toStringValue(response.data.other_address),
  }
}

export async function getOrderTxlogStatistics(input: {
  orderType?: OrderTypeFilter
  otherAddress?: string
} & RangeQuery) {
  const endpoint = input.otherAddress
    ? "/api/order/member/order/cp-cash-statistics/special-Address"
    : "/api/order/member/order/cp-cash-statistics"

  const response = await apiClient.get<ApiEnvelope<OrderStatisticsPayload>>(endpoint, {
    params: {
      order_type: input.orderType,
      other_address: input.otherAddress,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      started_timestamp: input.startedTimestamp,
      ended_timestamp: input.endedTimestamp,
    },
    paramsSerializer: params => serializeParams(params as Record<string, unknown>),
  })

  return toOrderStatistics(response.data.data)
}

export async function getOrderDetail(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<OrderDetailPayload>>(`/api/order/member/order/cp-cash-show/${orderSn}`)
  const data = response.data?.data
  if (data == null) {
    throw new Error("Order detail not found")
  }
  return toOrderDetail(data)
}

export async function confirmOrder(orderSn: string) {
  const response = await apiClient.put<ApiEnvelope<boolean>>(`/api/order/member/order/confirm/${orderSn}`, {})
  return Boolean(response.data.data)
}

export async function deleteOrder(orderSn: string) {
  const response = await apiClient.delete<ApiEnvelope<boolean>>(`/api/order/member/order/${orderSn}`)
  return Boolean(response.data.data)
}

export async function sendDigitalReceiptEmail(input: { orderSn: string; email: string }) {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/order/member/order/digital-receipt-email", {
    order_sn: input.orderSn,
    email: input.email,
  })

  return Boolean(response.data.data)
}

export async function sendFlowProofEmail(input: {
  email: string
  address: string
  startedAt: string
  endedAt: string
}) {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/order/member/order/transaction-proof-email", {
    email: input.email,
    address: input.address,
    started_at: input.startedAt,
    ended_at: input.endedAt,
  })

  return Boolean(response.data.data)
}

export async function getTransferVoucher(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<TransferVoucherPayload>>(`/api/order/member/order/transfer-share-show/${orderSn}`)
  return toTransferVoucherDetail(response.data.data)
}

export async function getRefundDetail(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<RefundDetailPayload>>("/api/order/member/order/refundDetail", {
    params: {
      orderSn,
    },
  })

  return toRefundDetail(response.data.data)
}

export async function getBillDetail(input: { orderSn: string; address?: string }) {
  const response = await apiClient.get<ApiEnvelope<BillDetailPayload>>(`/api/order/member/order/cp-cash-bill-show/${input.orderSn}`, {
    params: {
      address: input.address,
    },
  })

  return toBillDetail(response.data.data)
}

export async function getOrderBillAddresses(input: { page?: number; perPage?: number } & RangeQuery) {
  const response = await apiClient.get<PagedApiEnvelope<OrderBillAddressPayload>>("/api/order/member/order/stat-All-address-page", {
    params: {
      page: input.page ?? 1,
      per_page: input.perPage ?? 999,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      started_timestamp: input.startedTimestamp,
      ended_timestamp: input.endedTimestamp,
    },
  })

  return {
    data: Array.isArray(response.data.data) ? response.data.data.map(toOrderBillAddressItem) : [],
    total: toNumber(response.data.total),
    page: toNumber(response.data.page) || (input.page ?? 1),
  }
}

export async function getOrderBillStatistics(input: RangeQuery) {
  const response = await apiClient.get<ApiEnvelope<OrderStatisticsPayload>>("/api/order/member/order/stat-All-address-stat", {
    params: {
      started_at: input.startedAt,
      ended_at: input.endedAt,
      started_timestamp: input.startedTimestamp,
      ended_timestamp: input.endedTimestamp,
    },
  })

  return toOrderStatistics(response.data.data)
}

export async function exportOrderBill(input: {
  startedAt: string
  endedAt: string
  email: string
  orderSn?: string
  orderType?: string
  startedTimestamp?: number
  endedTimestamp?: number
}) {
  const response = await apiClient.get<ApiEnvelope<boolean | string>>("/api/order/member/order/cp-cash-export", {
    params: {
      started_at: input.startedAt,
      ended_at: input.endedAt,
      email: input.email,
      order_sn: input.orderSn,
      order_type: input.orderType,
      started_timestamp: input.startedTimestamp,
      ended_timestamp: input.endedTimestamp,
    },
  })

  return response.data.data
}

export async function listUserCategoryLabels() {
  const response = await apiClient.get<ApiEnvelope<CategoryLabelPayload[]>>(
    "/api/order/member/orderCategory/listUserCategoryLabel",
  )

  return Array.isArray(response.data.data) ? response.data.data.map(toCategoryLabel) : []
}

export async function createCategoryLabel(input: { labelName: string }) {
  const response = await apiClient.post<ApiEnvelope<boolean>>("/api/order/member/orderCategory/saveCategoryLabel", {
    label_name: input.labelName,
  })

  return Boolean(response.data.data)
}

export async function deleteCategoryLabel(categoryId: string) {
  const response = await apiClient.delete<ApiEnvelope<boolean>>("/api/order/member/orderCategory/deleteCategoryLabel", {
    params: {
      category_id: categoryId,
    },
  })

  return Boolean(response.data.data)
}

export async function findOrderLabels(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<BoundOrderLabelPayload>>("/api/order/member/orderCategory/findOrderLabels", {
    params: {
      order_sn: orderSn,
    },
  })

  const data = response.data.data

  return {
    notes: toStringValue(data?.notes),
    notesImageUrl: toStringValue(data?.notes_image_url),
    labels: Array.isArray(data?.member_order_label_item_volist) ? data.member_order_label_item_volist.map(toCategoryLabel) : [],
  } satisfies OrderLabelBinding
}

export async function bindCategoryLabel(input: {
  orderSn: string
  categoryLabelIds: string[]
  notes: string
  notesImageUrl?: string
}) {
  const response = await apiClient.post<ApiEnvelope<boolean>>("/api/order/member/orderCategory/bindCategoryLabel", {
    order_sn: input.orderSn,
    category_label_ids: input.categoryLabelIds,
    notes: input.notes,
    notes_image_url: input.notesImageUrl,
  })

  return Boolean(response.data.data)
}

export async function uploadOrderNoteImage(image: UploadableImage) {
  const formData = new FormData()

  formData.append("file", buildImageUploadFormDataPart(image, "note.jpg"))

  const response = await apiClient.post<ApiEnvelope<UploadFilePayload>>("/api/system/member/storage/upload-file", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return resolveUploadedFileUrl(response.data.data)
}
