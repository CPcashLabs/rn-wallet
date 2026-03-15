import { syncCurrentUserProfile } from "@/features/home/hooks/useProfileSync"
import { writeAuthSession } from "@/shared/api/auth-session"
import { resetProfileSyncSession } from "@/shared/session/profileSyncSession"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"

import type { AuthenticatedSessionInput } from "@/features/auth/types"

export async function persistAuthenticatedSession(input: AuthenticatedSessionInput) {
  const session = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    address: input.address,
    loginType: input.loginType,
    passkeyRawId: input.passkeyRawId,
  }

  await writeAuthSession(session)

  resetProfileSyncSession()
  useAuthStore.getState().setSession(session)
  useAuthStore.getState().setLoginType(input.loginType)

  if (!useUserStore.getState().profile?.address) {
    useUserStore.getState().patchProfile({
      address: input.address,
    })
  }

  const walletState = useWalletStore.getState()
  useWalletStore.getState().setWalletState({
    status: "connected",
    address: input.address,
    chainId: walletState.chainId ?? DEFAULT_WALLET_CHAIN_ID,
  })

  void syncCurrentUserProfile()
}
