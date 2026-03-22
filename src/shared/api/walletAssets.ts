import { apiClient } from "@/shared/api/client"
import { type ApiEnvelope, unwrapEnvelope } from "@/shared/api/envelope"

export type WalletChainName = "BTT" | "BTT_TEST"

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
  chainFullName: string
  chainLogo: string
  chainColor: string
  contract: string
  price: number
  precision: number
}

function toWalletCoin(payload: CoinListPayloadItem): WalletCoin {
  return {
    code: payload.code,
    symbol: payload.symbol,
    name: payload.name,
    logo: payload.logo,
    chainName: payload.chain_name,
    chainFullName: payload.chain_full_name,
    chainLogo: payload.chain_logo,
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
