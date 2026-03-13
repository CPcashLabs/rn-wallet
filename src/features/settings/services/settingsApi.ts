import { apiClient } from "@/shared/api/client"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type ExchangeRatePayload = {
  currency: string
  value: string
  symbol: string
}

type ChainPayload = {
  chain_name?: string
  chain_full_name?: string
  chain_id?: string | number
  rpc_urls?: string[]
}

export type ExchangeRateItem = {
  currency: string
  value: string
  symbol: string
}

export type ChainNodeConfig = {
  chainName: string
  chainFullName: string
  chainId: string
  rpcUrls: string[]
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

export async function updateTransferEmailNotification(enable: boolean) {
  const response = await apiClient.put<ApiEnvelope<boolean>>(`/api/system/member/security/transfer-email-notify-enable/${enable}`, { enable })
  return unwrapEnvelope(response.data)
}

export async function updateRewardEmailNotification(enable: boolean) {
  const response = await apiClient.put<ApiEnvelope<boolean>>(`/api/system/member/security/reward-email-notify-enable/${enable}`, { enable })
  return unwrapEnvelope(response.data)
}

export async function updateReceiptEmailNotification(enable: boolean) {
  const response = await apiClient.put<ApiEnvelope<boolean>>(`/api/system/member/security/receipt-email-notify-enable/${enable}`, { enable })
  return unwrapEnvelope(response.data)
}

export async function updateBackupWalletNotification(enable: boolean) {
  const response = await apiClient.put<ApiEnvelope<boolean>>(`/api/system/member/security/backup-wallet-notify-enable/${enable}`, { enable })
  return unwrapEnvelope(response.data)
}

export async function sendBindEmailCaptcha(email: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/api/system/member/security/send-update-email-captcha/${encodeURIComponent(email)}`)
  return unwrapEnvelope(response.data)
}

export async function bindEmail(input: { email: string; captcha: string }) {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/system/member/security/email", input)
  return unwrapEnvelope(response.data)
}

export async function sendUnbindEmailCaptcha(email: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>(`/api/system/member/security/send-Unbinding-email-captcha/${encodeURIComponent(email)}`)
  return unwrapEnvelope(response.data)
}

export async function unbindEmail(input: { email: string; captcha: string }) {
  const response = await apiClient.put<ApiEnvelope<boolean>>("/api/system/member/security/unBindEmail", input)
  return unwrapEnvelope(response.data)
}

export async function getExchangeRates() {
  const response = await apiClient.get<ApiEnvelope<ExchangeRatePayload[]>>("/api/system/member/french-currency/exchange-rate-by-usd")
  return unwrapEnvelope(response.data)
}

export async function getChainList() {
  const response = await apiClient.get<ApiEnvelope<ChainPayload[]>>("/api/blockchain/member/chain/list")
  return unwrapEnvelope(response.data).map(item => ({
    chainName: item.chain_name ?? "BTT",
    chainFullName: item.chain_full_name ?? item.chain_name ?? "BTT",
    chainId: String(item.chain_id ?? "199"),
    rpcUrls: item.rpc_urls ?? [],
  }))
}

export async function sendFeedback(content: string) {
  const response = await apiClient.post<ApiEnvelope<boolean>>("/api/system/member/telegram/send", { content })
  return unwrapEnvelope(response.data)
}
