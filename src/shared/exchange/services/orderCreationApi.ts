import { apiClient } from "@/shared/api/client"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
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

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
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
    pay_wallet_type: input.multisigWalletId ? "MULTISIG" : undefined,
  })

  return toCreatedNormalOrder(unwrapEnvelope(response.data))
}
