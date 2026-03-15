import { apiClient } from "@/shared/api/client"
import { getCoinList, resolveChainNameById, type WalletChainName } from "@/shared/api/walletAssets"

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

type ExchangeShowPayload = {
  fee_amount?: number
  fee_value?: number
  recv_amount?: number
  recv_coin_code?: string
  recv_coin_name?: string
  send_amount?: number
  send_coin_code?: string
  send_coin_name?: string
  send_min_amount?: number
  send_max_amount?: number
  seller_id?: number | string
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

export type TransferOrderOption = {
  sellerId: string
  sendCoinCode: string
  sendCoinSymbol: string
  recvCoinCode: string
  recvCoinSymbol: string
  feeAmount: number
  recvEstimateAmount: number
  sendMinAmount: number
  sendCoinContract: string
}

export type TransferOrderOptions = {
  chainName: string
  chainFullName: string
  chainLogo: string
  chainColor: string
  options: TransferOrderOption[]
}

export type TransferGasEstimate = {
  gasAmount: number
}

export type TransferQuote = {
  feeAmount: number
  feeValue: number
  recvAmount: number
  recvCoinCode: string
  recvCoinName: string
  sendAmount: number
  sendCoinCode: string
  sendCoinName: string
  sendMinAmount: number
  sendMaxAmount: number
  sellerId: number
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

function toTransferQuote(payload: ExchangeShowPayload): TransferQuote {
  return {
    feeAmount: toNumber(payload.fee_amount),
    feeValue: toNumber(payload.fee_value),
    recvAmount: toNumber(payload.recv_amount),
    recvCoinCode: String(payload.recv_coin_code ?? ""),
    recvCoinName: String(payload.recv_coin_name ?? payload.recv_coin_code ?? ""),
    sendAmount: toNumber(payload.send_amount),
    sendCoinCode: String(payload.send_coin_code ?? ""),
    sendCoinName: String(payload.send_coin_name ?? payload.send_coin_code ?? ""),
    sendMinAmount: toNumber(payload.send_min_amount),
    sendMaxAmount: toNumber(payload.send_max_amount),
    sellerId: toNumber(payload.seller_id),
  }
}

async function getRebateExchangePairs() {
  const response = await apiClient.get<ApiEnvelope<RebatePairPayload[]>>("/api/fund/member/order-rebate-claim/list-exchange-pair")
  return unwrapEnvelope(response.data)
}

export async function getTransferChannels(chainId?: string | number | null, intent: "transfer" | "receive" = "transfer") {
  const sendChainName = resolveChainNameById(chainId)
  const bridgeSendChains = intent === "receive" ? Array.from(new Set([sendChainName, "BTT", "BTT_TEST"])) : [sendChainName]
  const [rebatesResult, bridgeAllowListResults, normalAllowListResult] = await Promise.all([
    getRebateExchangePairs()
      .then(data => ({ ok: true as const, data }))
      .catch(error => ({ ok: false as const, error })),
    Promise.allSettled(
      bridgeSendChains.map(sendChain =>
        apiClient.get<ApiEnvelope<BridgeAllowListPayload[]>>("/api/seller/member/exchange/cp-cash-allow-list", {
          params: {
            group_by_type: 1,
            send_coin_symbol: "USDT",
            send_chain_name: sendChain,
          },
        }),
      ),
    ),
    apiClient
      .get<ApiEnvelope<NormalAllowListPayload[]>>("/api/system/member/coinallow/allow-list", {
        params: {
          is_send_allowed: true,
          is_recv_allowed: true,
        },
      })
      .then(data => ({ ok: true as const, data }))
      .catch(error => ({ ok: false as const, error })),
  ])

  const rebates = rebatesResult.ok ? rebatesResult.data : []
  const bridgeAllowLists = bridgeAllowListResults.flatMap(result => {
    if (result.status !== "fulfilled") {
      return []
    }

    return [result.value]
  })
  const normalAllowList = normalAllowListResult.ok ? normalAllowListResult.data : null

  if (bridgeAllowLists.length === 0 && !normalAllowList?.data) {
    throw (normalAllowListResult.ok ? rebatesResult.ok ? new Error("receive_channel_unavailable") : rebatesResult.error : normalAllowListResult.error)
  }

  const rebateCoinCodes = new Set(rebates.map(item => item.recv_coin_code))
  const bridgeMap = new Map<string, TransferChannel>()

  bridgeAllowLists.flatMap(response => unwrapEnvelope(response.data)).forEach(item => {
    if (!item.chain_name || bridgeMap.has(item.chain_name)) {
      return
    }

    bridgeMap.set(item.chain_name, {
      key: `bridge:${item.chain_name}`,
      channelType: "bridge",
      receiveChainName: item.chain_name,
      receiveChainFullName: item.chain_full_name,
      receiveChainColor: item.chain_color,
      receiveChainLogo: item.chain_logo,
      addressRegexes: item.chain_address_format_regex,
      title: item.chain_name,
      subtitle: item.chain_full_name,
      isRebate: item.exchange_pairs.some(pair => rebateCoinCodes.has(pair.recv_coin_code)),
    })
  })

  const normalChannels = (normalAllowList?.data ? unwrapEnvelope(normalAllowList.data) : [])
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

  return [...normalChannels, ...bridgeMap.values()]
}

export async function getTransferOrderOptions(input: {
  sendChainName: string
  receiveChainName: string
  channelType: "bridge" | "normal"
}) {
  const [coinList, bridgeAllowList, normalAllowList] = await Promise.all([
    getCoinList(input.sendChainName as WalletChainName),
    input.channelType === "bridge"
      ? apiClient.get<ApiEnvelope<BridgeAllowListPayload[]>>("/api/seller/member/exchange/cp-cash-allow-list", {
          params: {
            group_by_type: 1,
            send_coin_symbol: "USDT",
            send_chain_name: input.sendChainName,
          },
        })
      : Promise.resolve(null),
    input.channelType === "normal"
      ? apiClient.get<ApiEnvelope<NormalAllowListPayload[]>>("/api/system/member/coinallow/allow-list", {
          params: {
            chain_name: input.sendChainName,
            is_send_allowed: true,
            is_recv_allowed: true,
          },
        })
      : Promise.resolve(null),
  ])
  const coinLookup = new Map(coinList.map(item => [item.code, item]))

  const bridgeChannel =
    bridgeAllowList?.data ? unwrapEnvelope(bridgeAllowList.data).find(item => item.chain_name === input.receiveChainName) : null
  const normalChannel =
    normalAllowList?.data ? unwrapEnvelope(normalAllowList.data).find(item => item.chain_name === input.sendChainName) : null

  const pairOptions =
    bridgeChannel?.exchange_pairs?.map<TransferOrderOption>(item => {
      const coin = coinLookup.get(String(item.send_coin_code ?? ""))

      return {
        sellerId: "",
        sendCoinCode: String(item.send_coin_code ?? ""),
        sendCoinSymbol: String(item.send_coin_symbol ?? coin?.symbol ?? item.send_coin_code ?? ""),
        recvCoinCode: String(item.recv_coin_code ?? ""),
        recvCoinSymbol: String(item.recv_coin_symbol ?? item.recv_coin_code ?? ""),
        feeAmount: 0,
        recvEstimateAmount: 0,
        sendMinAmount: 0,
        sendCoinContract: String(coin?.contract ?? ""),
      }
    }) ?? []

  const sameChainOptions =
    normalChannel?.coins
      ?.filter(item => item.is_send_allowed)
      .map<TransferOrderOption>(item => {
        const code = String(item.coin_code ?? "")
        const coin = coinLookup.get(code)

        return {
          sellerId: "",
          sendCoinCode: code,
          sendCoinSymbol: String(item.coin_symbol ?? coin?.symbol ?? code),
          recvCoinCode: "",
          recvCoinSymbol: "",
          feeAmount: 0,
          recvEstimateAmount: 0,
          sendMinAmount: 0,
          sendCoinContract: String(coin?.contract ?? ""),
        }
      }) ?? []

  return {
    chainName: String(bridgeChannel?.chain_name ?? normalChannel?.chain_name ?? input.receiveChainName),
    chainFullName: String(bridgeChannel?.chain_full_name ?? normalChannel?.chain_full_name ?? input.receiveChainName),
    chainLogo: String(bridgeChannel?.chain_logo ?? normalChannel?.chain_logo ?? ""),
    chainColor: String(bridgeChannel?.chain_color ?? normalChannel?.chain_color ?? ""),
    options: input.channelType === "bridge" ? pairOptions : sameChainOptions,
  } satisfies TransferOrderOptions
}

export async function getTransferGasEstimate(input: { chainName: string; contractAddress: string }) {
  if (!input.contractAddress) {
    return {
      gasAmount: 0,
    } satisfies TransferGasEstimate
  }

  const response = await apiClient.get<ApiEnvelope<string | number>>("/api/blockchain/member/chain/get-transfer-gas", {
    params: {
      chain_name: input.chainName,
      contract_address: input.contractAddress,
    },
  })

  return {
    gasAmount: toNumber(unwrapEnvelope(response.data)),
  } satisfies TransferGasEstimate
}

export async function getTransferQuote(input: {
  sendCoinCode: string
  recvCoinCode: string
  recvAmount: number
  rateType?: 0 | 1
}) {
  const response = await apiClient.get<ApiEnvelope<ExchangeShowPayload>>("/api/seller/member/exchange/cp-cash-show", {
    params: {
      send_coin_code: input.sendCoinCode,
      recv_coin_code: input.recvCoinCode,
      recv_amount: input.recvAmount,
      rate_type: input.rateType ?? 1,
    },
  })

  return toTransferQuote(unwrapEnvelope(response.data))
}
