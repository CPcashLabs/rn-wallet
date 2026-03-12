import { Contract, JsonRpcProvider, Wallet, formatUnits, parseUnits } from "ethers"

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
]

const CHAIN_CONFIG = {
  BTT: {
    chainId: 199,
    rpcUrls: ["https://rpc.bt.io/", "https://rpc.bittorrentchain.io"],
  },
  BTT_TEST: {
    chainId: 1029,
    rpcUrls: ["https://pre-rpc.bt.io/", "https://pre-rpc.bittorrentchain.io/"],
  },
} as const

type SupportedChainName = keyof typeof CHAIN_CONFIG

function resolveChainConfig(chainName: string) {
  const config = CHAIN_CONFIG[chainName as SupportedChainName]

  if (!config) {
    throw new Error(`Unsupported chain: ${chainName}`)
  }

  return config
}

async function withRpcProvider<T>(chainName: string, task: (provider: JsonRpcProvider) => Promise<T>) {
  const config = resolveChainConfig(chainName)
  let lastError: unknown = null

  for (const rpcUrl of config.rpcUrls) {
    const provider = new JsonRpcProvider(
      rpcUrl,
      {
        chainId: config.chainId,
        name: chainName,
      },
      {
        staticNetwork: true,
      },
    )

    try {
      return await task(provider)
    } catch (error) {
      lastError = error
    } finally {
      provider.destroy()
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`All RPC endpoints failed for ${chainName}`)
}

export async function getNativeBalance(input: {
  chainName: string
  address: string
}) {
  return withRpcProvider(input.chainName, async provider => {
    const balance = await provider.getBalance(input.address)
    return Number(formatUnits(balance, 18))
  })
}

export async function getTokenBalance(input: {
  chainName: string
  contractAddress: string
  address: string
  decimals: number
}) {
  return withRpcProvider(input.chainName, async provider => {
    const contract = new Contract(input.contractAddress, ERC20_ABI, provider)
    const balance = await contract.balanceOf(input.address)
    return Number(formatUnits(balance, input.decimals))
  })
}

export async function sendErc20Transfer(input: {
  chainName: string
  contractAddress: string
  privateKey: string
  recipient: string
  amount: string
  decimals: number
}) {
  return withRpcProvider(input.chainName, async provider => {
    const signer = new Wallet(input.privateKey, provider)
    const contract = new Contract(input.contractAddress, ERC20_ABI, signer)
    const tx = await contract.transfer(input.recipient, parseUnits(input.amount, input.decimals))

    return {
      hash: tx.hash,
    }
  })
}
