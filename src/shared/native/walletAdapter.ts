import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { getOrCreateLocalWallet, signWithLocalWallet } from "@/shared/native/localAuthVault"

export type WalletConnection = {
  address: string
  chainId?: string
  providerName?: string
}

export interface WalletAdapter {
  getCapability(): CapabilityDescriptor
  connect(): Promise<AdapterResult<WalletConnection>>
  signMessage(message: string): Promise<AdapterResult<{ signature: string }>>
}

export const walletAdapter: WalletAdapter = {
  getCapability() {
    return {
      supported: true,
    }
  },
  async connect() {
    try {
      const wallet = await getOrCreateLocalWallet()

      return {
        ok: true,
        data: {
          address: wallet.address,
          chainId: wallet.chainId,
          providerName: wallet.providerName,
        },
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Wallet connection failed"),
      } as AdapterResult<WalletConnection>
    }
  },
  async signMessage(message) {
    try {
      return {
        ok: true,
        data: await signWithLocalWallet(message),
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Wallet signature failed"),
      } as AdapterResult<{ signature: string }>
    }
  },
}
