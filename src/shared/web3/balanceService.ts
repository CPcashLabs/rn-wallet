import { AbiCoder, Interface, ethers, formatUnits } from "ethers"

import type { WalletCoin } from "@/shared/api/walletAssets"
import { getNumber } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
export const RPC_REQUEST_TIMEOUT_MS = 8_000
const erc20BalanceOfInterface = new Interface(["function balanceOf(address owner) view returns (uint256)"])
const abiCoder = new AbiCoder()

const rpcList: Record<number, string[]> = {
  199: ["https://rpc.bt.io/", "https://rpc.bittorrentchain.io"],
  1029: ["https://pre-rpc.bt.io/", "https://pre-rpc.bittorrentchain.io/"],
}

const networkNames: Record<number, string> = {
  199: "BitTorrent Chain Mainnet",
  1029: "BitTorrent Chain Testnet",
}

const providerCache = new Map<number, ethers.JsonRpcProvider>()

function resolveChainId(chainId?: string | number | null) {
  return String(chainId ?? "") === "199" ? 199 : 1029
}

function isNativeToken(contract?: string) {
  return !contract || contract.toLowerCase() === ZERO_ADDRESS
}

function toNumberBalance(value: bigint, precision: number) {
  const normalized = formatUnits(value, precision)
  const parsed = Number.parseFloat(normalized)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return parsed
}

type BalanceRpcProvider = Pick<ethers.JsonRpcProvider, "call" | "getBalance">

function createRpcTimeoutError(label: string) {
  return new Error(`rpc_timeout:${label}`)
}

async function withRpcTimeout<T>(request: Promise<T>, label: string) {
  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      request,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(createRpcTimeoutError(label))
        }, RPC_REQUEST_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

export function getRpcProvider(chainId?: string | number | null) {
  const resolvedChainId = resolveChainId(chainId)
  const cached = providerCache.get(resolvedChainId)

  if (cached) {
    return cached
  }

  const persistedRpcIndex = getNumber(KvStorageKeys.WalletRpcIndex) ?? 0
  const rpcUrl = rpcList[resolvedChainId]?.[persistedRpcIndex] ?? rpcList[resolvedChainId]?.[0] ?? rpcList[199][0]
  const network = new ethers.Network(networkNames[resolvedChainId] ?? networkNames[199], BigInt(resolvedChainId))
  const provider = new ethers.JsonRpcProvider(
    rpcUrl,
    {
      chainId: resolvedChainId,
      name: network.name,
    },
    { staticNetwork: network },
  )

  providerCache.set(resolvedChainId, provider)
  return provider
}

export function resetRpcProvider(chainId?: string | number | null) {
  const resolvedChainId = resolveChainId(chainId)
  const cached = providerCache.get(resolvedChainId)

  if (cached) {
    cached.destroy()
    providerCache.delete(resolvedChainId)
  }
}

export async function fetchOnChainBalances(params: {
  address?: string | null
  chainId?: string | number | null
  coins: WalletCoin[]
  provider?: BalanceRpcProvider
}) {
  const { address, chainId, coins } = params

  if (!address || coins.length === 0) {
    return {}
  }

  const provider = params.provider ?? getRpcProvider(chainId)

  const results = await Promise.allSettled(
    coins.map(async coin => {
      if (isNativeToken(coin.contract)) {
        const balance = await withRpcTimeout(provider.getBalance(address), `${coin.code}:native`)
        return [coin.code, toNumberBalance(balance, coin.precision)] as const
      }

      const data = erc20BalanceOfInterface.encodeFunctionData("balanceOf", [address])
      const result = await withRpcTimeout(provider.call({ to: coin.contract, data }), `${coin.code}:erc20`)
      const [value] = abiCoder.decode(["uint256"], result)
      return [coin.code, toNumberBalance(value, coin.precision)] as const
    }),
  )

  return results.reduce<Record<string, number>>((acc, result, index) => {
    const fallbackCode = coins[index]?.code
    if (!fallbackCode) {
      return acc
    }

    if (result.status === "fulfilled") {
      const [code, balance] = result.value
      acc[code] = balance
      return acc
    }

    acc[fallbackCode] = 0
    return acc
  }, {})
}
