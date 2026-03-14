import { apiClient } from "@/shared/api/client"

export type WalletChainName = "BTT" | "BTT_TEST"

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type CoinListPayloadItem = {
  name: string
  logo: string
  code: string
  symbol: string
  chain_name: string
  chain_full_name: string
  chain_logo: string
  chain_color: string
  contract: string
  price: number
  precision: number
}

export type WalletCoin = {
  code: string
  symbol: string
  name: string
  logo: string
  chainName: string
  chainColor: string
  contract: string
  price: number
  precision: number
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

function toWalletCoin(payload: CoinListPayloadItem): WalletCoin {
  return {
    code: payload.code,
    symbol: payload.symbol,
    name: payload.name,
    logo: payload.logo,
    chainName: payload.chain_name,
    chainColor: payload.chain_color,
    contract: payload.contract,
    price: payload.price,
    precision: payload.precision,
  }
}

export function resolveChainNameById(chainId?: string | number | null): WalletChainName {
  if (String(chainId ?? "") === "199") {
    return "BTT"
  }

  return "BTT_TEST"
}

export async function getCoinList(chainName: WalletChainName) {
  const response = await apiClient.get<ApiEnvelope<CoinListPayloadItem[]>>("/api/blockchain/member/coin/list", {
    params: {
      chain_name: chainName,
    },
  })

  return unwrapEnvelope(response.data).map(toWalletCoin)
}
