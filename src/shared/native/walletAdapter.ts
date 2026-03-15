import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { getOrCreateLocalWallet, importLocalWallet, signWithLocalWallet } from "@/shared/native/localAuthVault"
import type { WalletImportType } from "@/shared/native/walletImport"

export type WalletConnection = {
  address: string
  chainId?: string
  providerName?: string
}

export type ImportedWalletConnection = WalletConnection & {
  importedType: WalletImportType
}

export interface WalletAdapter {
  getCapability(): CapabilityDescriptor
  connect(): Promise<AdapterResult<WalletConnection>>
  importSecret(secret: string): Promise<AdapterResult<ImportedWalletConnection>>
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
  async importSecret(secret) {
    try {
      const wallet = await importLocalWallet(secret)

      return {
        ok: true,
        data: {
          address: wallet.address,
          chainId: wallet.chainId,
          providerName: wallet.providerName,
          importedType: wallet.importedType,
        },
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Wallet import failed"),
      } as AdapterResult<ImportedWalletConnection>
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
