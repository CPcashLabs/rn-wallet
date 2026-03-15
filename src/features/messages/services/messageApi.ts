import { type ApiEnvelope } from "@/shared/api/envelope"
import { toNumber, toStringValue, toTimestamp } from "@/shared/api/normalize"
import { apiClient } from "@/shared/api/client"

type MessageItemPayload = {
  id?: number | string
  order_type?: string
  created_at?: number | string
  receive_address?: string
  payment_address?: string
  order_sn?: string
  multisig_wallet_id?: number | string | null
  operator_nickname?: string
  multisig_wallet_name?: string
  deposit_address?: string
  transfer_address?: string
  type?: string
  wallet_type?: string
  send_actual_amount?: number | string
  send_amount?: number | string
  send_coin_name?: string
  recv_actual_amount?: number | string
  recv_amount?: number | string
  recv_coin_name?: string
  status?: number | string
}

export type MessageItem = {
  id: string
  orderType: string
  createdAt: number | null
  receiveAddress: string
  paymentAddress: string
  orderSn: string
  multisigWalletId: string
  operatorNickname: string
  multisigWalletName: string
  depositAddress: string
  transferAddress: string
  type: string
  walletType: string
  sendActualAmount: number
  sendAmount: number
  sendCoinName: string
  recvActualAmount: number
  recvAmount: number
  recvCoinName: string
  status: number
}

function toMessageItem(payload: MessageItemPayload): MessageItem {
  return {
    id: toStringValue(payload.id),
    orderType: toStringValue(payload.order_type),
    createdAt: toTimestamp(payload.created_at),
    receiveAddress: toStringValue(payload.receive_address),
    paymentAddress: toStringValue(payload.payment_address),
    orderSn: toStringValue(payload.order_sn),
    multisigWalletId: toStringValue(payload.multisig_wallet_id),
    operatorNickname: toStringValue(payload.operator_nickname),
    multisigWalletName: toStringValue(payload.multisig_wallet_name),
    depositAddress: toStringValue(payload.deposit_address),
    transferAddress: toStringValue(payload.transfer_address),
    type: toStringValue(payload.type),
    walletType: toStringValue(payload.wallet_type),
    sendActualAmount: toNumber(payload.send_actual_amount),
    sendAmount: toNumber(payload.send_amount),
    sendCoinName: toStringValue(payload.send_coin_name) || "USDT",
    recvActualAmount: toNumber(payload.recv_actual_amount),
    recvAmount: toNumber(payload.recv_amount),
    recvCoinName: toStringValue(payload.recv_coin_name) || "USDT",
    status: toNumber(payload.status),
  }
}

export async function getMessageList(input?: { page?: number; perPage?: number }) {
  const response = await apiClient.get<ApiEnvelope<MessageItemPayload[]>>("/api/system/member/message/order-page", {
    params: {
      page: input?.page ?? 1,
      per_page: input?.perPage ?? 10,
      no_cache: true,
    },
  })

  const payload = response.data

  return {
    data: Array.isArray(payload.data) ? payload.data.map(toMessageItem) : [],
    total: toNumber(payload.total),
    page: toNumber(payload.page) || (input?.page ?? 1),
    perPage: toNumber(payload.per_page) || (input?.perPage ?? 10),
  }
}

export async function markMessageRead(id: string) {
  const response = await apiClient.put<ApiEnvelope<boolean>>(`/api/system/member/message/read/${id}`, {})
  return Boolean(response.data.data)
}

export async function markAllMessagesRead() {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/system/member/message/read-all", {})
  return Boolean(response.data.data)
}
