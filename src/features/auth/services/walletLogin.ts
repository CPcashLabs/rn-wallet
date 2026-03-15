import { bindInviteCode, signInWithMessageSignature } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { resetToMainTabs } from "@/app/navigation/navigationRef"

export type WalletLoginMessage = {
  address: string
  login_time: string
}

export function createWalletLoginMessage(address: string): WalletLoginMessage {
  return {
    address,
    login_time: Date.now().toString(),
  }
}

export async function finalizeWalletLogin(params: {
  address: string
  signature: string
  message: WalletLoginMessage
  inviteCode?: string
  onInviteBindingMessage?: (message: string) => void
}) {
  const tokens = await signInWithMessageSignature({
    signature: params.signature,
    address: params.address,
    message: JSON.stringify(params.message),
  })

  await persistAuthenticatedSession({
    ...tokens,
    address: params.address,
    loginType: "wallet",
  })

  if (params.inviteCode) {
    try {
      await bindInviteCode(params.inviteCode)
    } catch (error) {
      params.onInviteBindingMessage?.(getInviteBindingMessage(error))
    }
  }

  resetToMainTabs()
}
