import { walletAdapter } from "@/shared/native/walletAdapter"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import type {
  HostApi,
  PluginCloseResult,
  PluginId,
  ReceiveIntent,
  ReceiveIntentResult,
  SignMessageInput,
  SignMessageResult,
  SignTransactionInput,
  SignTransactionResult,
  TransferIntent,
  TransferIntentResult,
  WalletAddressDescriptor,
} from "@/shared/plugins/types"

function resolveWalletAddresses(): WalletAddressDescriptor[] {
  const authSession = useAuthStore.getState().session
  const profile = useUserStore.getState().profile
  const walletState = useWalletStore.getState()
  const candidates: WalletAddressDescriptor[] = []

  if (walletState.address) {
    candidates.push({
      address: walletState.address,
      chainId: walletState.chainId,
      source: "wallet",
    })
  }

  if (profile?.address && profile.address !== walletState.address) {
    candidates.push({
      address: profile.address,
      chainId: walletState.chainId,
      source: "profile",
    })
  }

  if (authSession?.address && authSession.address !== walletState.address && authSession.address !== profile?.address) {
    candidates.push({
      address: authSession.address,
      chainId: walletState.chainId,
      source: "session",
    })
  }

  return candidates
}

function notImplemented(methodName: keyof Pick<HostApi, "signTransaction" | "createTransferIntent" | "createReceiveIntent">): never {
  throw new Error(`Host API method "${methodName}" is not implemented yet.`)
}

async function signMessage(input: SignMessageInput): Promise<SignMessageResult> {
  const result = await walletAdapter.signMessage(input.message)
  if (!result.ok) {
    throw result.error
  }

  const walletState = useWalletStore.getState()

  return {
    signature: result.data.signature,
    address: walletState.address,
    chainId: walletState.chainId,
  }
}

async function signTransaction(input: SignTransactionInput): Promise<SignTransactionResult> {
  void input
  return notImplemented("signTransaction")
}

async function createTransferIntent(input: TransferIntent): Promise<TransferIntentResult> {
  void input
  return notImplemented("createTransferIntent")
}

async function createReceiveIntent(input: ReceiveIntent): Promise<ReceiveIntentResult> {
  void input
  return notImplemented("createReceiveIntent")
}

export function createHostApi(config: {
  pluginId: PluginId
  onRequestClose: (result?: PluginCloseResult) => void
}): HostApi {
  void config.pluginId

  return {
    async getLoginStatus() {
      const authState = useAuthStore.getState()

      return {
        loggedIn: Boolean(authState.session?.accessToken),
        loginType: authState.loginType,
      }
    },
    async getUserInfo() {
      return useUserStore.getState().profile
    },
    async getWalletAddresses() {
      return resolveWalletAddresses()
    },
    signMessage,
    signTransaction,
    createTransferIntent,
    createReceiveIntent,
    close(result) {
      config.onRequestClose(result)
    },
  }
}
