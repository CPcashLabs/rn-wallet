import { apiClient } from "@/shared/api/client"
import { resolveChainNameById } from "@/features/home/services/homeApi"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type RebatePairPayload = {
  recv_coin_code: string
  send_coin_code: string
}

type BridgeAllowListPayload = {
  chain_name: string
  chain_full_name: string
  chain_logo: string
  chain_color: string
  chain_address_format_regex: string[]
  exchange_pairs: Array<{
    recv_coin_code: string
    recv_coin_symbol: string
    send_coin_code: string
    send_coin_symbol: string
  }>
}

type NormalAllowListPayload = {
  chain_name: string
  chain_full_name: string
  chain_logo: string
  chain_color: string
  chain_address_format_regex: string[]
  coins: Array<{
    coin_code: string
    coin_symbol: string
    is_send_allowed: boolean
    is_recv_allowed: boolean
  }>
}

type RecentTransferPayload = {
  address: string
  amount: number
  coin_name: string
  created_at: number
  direction: "TRANSFER" | "RECEIVE"
  avatar?: string
}

export type TransferChannel = {
  key: string
  channelType: "bridge" | "normal"
  receiveChainName: string
  receiveChainFullName: string
  receiveChainColor: string
  receiveChainLogo: string
  addressRegexes: string[]
  title: string
  subtitle: string
  isRebate: boolean
}

export type RecentTransferEntry = {
  address: string
  amount: number
  coinName: string
  createdAt: number
  direction: "TRANSFER" | "RECEIVE"
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

export async function getTransferChannels(chainId?: string | number | null) {
  const sendChainName = resolveChainNameById(chainId)

  const [rebates, bridgeAllowList, normalAllowList] = await Promise.all([
    getRebateExchangePairs(),
    apiClient.get<ApiEnvelope<BridgeAllowListPayload[]>>("/api/seller/member/exchange/cp-cash-allow-list", {
      params: {
        group_by_type: 1,
        send_coin_symbol: "USDT",
        send_chain_name: sendChainName,
      },
    }),
    apiClient.get<ApiEnvelope<NormalAllowListPayload[]>>("/api/system/member/coinallow/allow-list", {
      params: {
        is_send_allowed: true,
        is_recv_allowed: true,
      },
    }),
  ])

  const rebateCoinCodes = new Set(rebates.map(item => item.recv_coin_code))

  const bridgeChannels = unwrapEnvelope(bridgeAllowList.data).map(item => ({
    key: `bridge:${item.chain_name}`,
    channelType: "bridge" as const,
    receiveChainName: item.chain_name,
    receiveChainFullName: item.chain_full_name,
    receiveChainColor: item.chain_color,
    receiveChainLogo: item.chain_logo,
    addressRegexes: item.chain_address_format_regex,
    title: item.chain_name,
    subtitle: item.chain_full_name,
    isRebate: item.exchange_pairs.some(pair => rebateCoinCodes.has(pair.recv_coin_code)),
  }))

  const activeNormalChannel = unwrapEnvelope(normalAllowList.data)
    .filter(item => item.chain_name === sendChainName)
    .map(item => ({
      key: `normal:${item.chain_name}`,
      channelType: "normal" as const,
      receiveChainName: item.chain_name,
      receiveChainFullName: item.chain_full_name,
      receiveChainColor: item.chain_color,
      receiveChainLogo: item.chain_logo,
      addressRegexes: item.chain_address_format_regex,
      title: `CPCash ${item.chain_name}`,
      subtitle: item.chain_full_name,
      isRebate: false,
    }))

  return [...activeNormalChannel, ...bridgeChannels]
}

async function getRebateExchangePairs() {
  const response = await apiClient.get<ApiEnvelope<RebatePairPayload[]>>("/api/fund/member/order-rebate-claim/list-exchange-pair")
  return unwrapEnvelope(response.data)
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
