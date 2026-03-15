import { type ApiEnvelope, unwrapEnvelope } from "@/shared/api/envelope"
import { toNumber } from "@/shared/api/normalize"
import { apiClient } from "@/shared/api/client"
import { getCoinList, resolveChainNameById, type WalletChainName } from "@/shared/api/walletAssets"
import { resolveRuntimeEnv } from "@/shared/config/runtime"
import { requestCpCashAllowList, requestCpCashShow, type RuntimeEnvName } from "@/shared/exchange/services/exchangeClient"
import { DEFAULT_WALLET_CHAIN_ID } from "@/shared/store/useWalletStore"

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

export type BttClaimStatus = {
  eligible: boolean
  claimAmount: number
  reasonCode: string
  threshold: number
}

function uniqueValues(values: Array<string | null | undefined>) {
  return values.filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
}

async function requestReceiveAllowList(input: {
  sendChainName: string
  recvChainName?: string
  env: RuntimeEnvName
}) {
  return requestCpCashAllowList<ReceiveAllowPayload>({
    group_by_type: 0,
    recv_coin_symbol: "USDT",
    send_chain_name: input.sendChainName,
    recv_chain_name: input.recvChainName,
    env: input.env,
  })
}

export async function getReceiveConfig(input: { payChain?: string; chainId?: string | number | null }) {
  const resolvedChainId = input.chainId ?? DEFAULT_WALLET_CHAIN_ID
  const recvChainName = resolveChainNameById(resolvedChainId)
  const env = resolveRuntimeEnv()
  const primarySendChainName = input.payChain || recvChainName
  const recvCandidates = uniqueValues([recvChainName, "BTT", "BTT_TEST"])
  const sendCandidates = uniqueValues([primarySendChainName, recvChainName, "BTT", "BTT_TEST"])

  let allowList: ReceiveAllowPayload[] = []
  let selectedSendChainName = primarySendChainName

  for (const sendChainName of sendCandidates) {
    for (const recvCandidate of recvCandidates) {
      allowList = await requestReceiveAllowList({
        sendChainName,
        recvChainName: recvCandidate,
        env,
      })

      if (allowList.length > 0) {
        selectedSendChainName = sendChainName
        break
      }
    }

    if (allowList.length > 0) {
      break
    }

    allowList = await requestReceiveAllowList({
      sendChainName,
      env,
    })

    if (allowList.length > 0) {
      selectedSendChainName = sendChainName
      break
    }
  }

  const first = allowList[0]
  const firstPair = first?.exchange_pairs?.[0]

  if (!first || !firstPair) {
    throw new Error(`receive_config_missing: ${sendCandidates.join(",")}`)
  }

  const sendCoins = await getCoinList(selectedSendChainName as WalletChainName)

  const exchange = await requestCpCashShow<ReceiveExchangePayload>({
    send_coin_code: firstPair.send_coin_code,
    recv_coin_code: firstPair.recv_coin_code,
    rate_type: 1,
    env,
  })
  const sendCoinMeta = sendCoins.find(item => item.code === firstPair.send_coin_code)

  return {
    payChain: String(first.chain_name ?? selectedSendChainName),
    payChainFullName: String(first.chain_full_name ?? first.chain_name ?? selectedSendChainName),
    payChainColor: String(first.chain_color ?? ""),
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

export async function createNativeOrder(input: {
  amount: number
  recvAddress: string
  recvCoinCode: string
  sendCoinCode: string
  sellerId: string
}) {
  const response = await apiClient.post<ApiEnvelope<ReceiveCreatePayload>>("/api/order/member/receiving/create-native", {
    send_amount: input.amount,
    recv_address: input.recvAddress,
    recv_coin_code: input.recvCoinCode,
    send_coin_code: input.sendCoinCode,
    seller_id: input.sellerId,
    env: resolveRuntimeEnv(),
  })

  const payload = unwrapEnvelope(response.data)

  return {
    orderSn: String(payload.order_sn ?? payload.serial_number ?? ""),
  }
}
