import { apiClient } from "@/shared/api/client"
import type { ApiEnvelope } from "@/shared/api/envelope"

type OrderDetailAccessPayload = {
  is_buyer?: boolean
}

export async function getWalletOrderAccess(orderSn: string) {
  const response = await apiClient.get<ApiEnvelope<OrderDetailAccessPayload>>(`/api/order/member/order/cp-cash-show/${orderSn}`)
  const data = response.data?.data

  if (data == null) {
    throw new Error("Order detail not found")
  }

  return {
    isBuyer: Boolean(data.is_buyer),
  }
}
