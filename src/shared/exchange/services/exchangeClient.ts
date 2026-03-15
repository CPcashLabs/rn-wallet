import { apiClient } from "@/shared/api/client"
import { unwrapEnvelope, type ApiEnvelope } from "@/shared/api/envelope"

export type RuntimeEnvName = "dev" | "test" | "preview" | "prod"

export type RebatePairPayload = {
  recv_coin_code: string
  send_coin_code: string
}

type CpCashAllowListParams = {
  group_by_type: 0 | 1
  send_chain_name: string
  send_coin_symbol?: string
  recv_chain_name?: string
  recv_coin_symbol?: string
  env?: RuntimeEnvName
}

type CoinAllowListParams = {
  chain_name?: string
  is_send_allowed: boolean
  is_recv_allowed: boolean
}

type CpCashShowParams = {
  send_coin_code?: string
  recv_coin_code?: string
  recv_amount?: number
  rate_type?: number
  env?: RuntimeEnvName
}

export async function requestRebateExchangePairs() {
  const response = await apiClient.get<ApiEnvelope<RebatePairPayload[]>>("/api/fund/member/order-rebate-claim/list-exchange-pair")
  return unwrapEnvelope(response.data)
}

export async function requestCpCashAllowList<T>(params: CpCashAllowListParams) {
  const response = await apiClient.get<ApiEnvelope<T[]>>("/api/seller/member/exchange/cp-cash-allow-list", {
    params: {
      send_coin_symbol: params.send_coin_symbol ?? "USDT",
      ...params,
    },
  })

  return unwrapEnvelope(response.data)
}

export async function requestCoinAllowList<T>(params: CoinAllowListParams) {
  const response = await apiClient.get<ApiEnvelope<T[]>>("/api/system/member/coinallow/allow-list", {
    params,
  })

  return unwrapEnvelope(response.data)
}

export async function requestCpCashShow<T>(params: CpCashShowParams) {
  const response = await apiClient.get<ApiEnvelope<T>>("/api/seller/member/exchange/cp-cash-show", {
    params,
  })

  return unwrapEnvelope(response.data)
}
