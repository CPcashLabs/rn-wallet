import { syncCurrentUserProfile } from "@/features/home/hooks/useProfileSync"
import { writeAuthSession } from "@/shared/api/auth-session"
import { logRuntimeInfo } from "@/shared/logging/appLogger"
import { resetProfileSyncSession } from "@/shared/session/profileSyncSession"
import { useAuthStore } from "@/shared/store/useAuthStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { DEFAULT_WALLET_CHAIN_ID, useWalletStore } from "@/shared/store/useWalletStore"

import type { AuthenticatedSessionInput } from "@/features/auth/types"

const AUTH_ORCHESTRATOR_LOG_TAG = "[auth.orchestrator]"
const AUTH_ORCHESTRATOR_COMPONENT = "auth.orchestrator"
const AUTH_ORCHESTRATOR_LOG_TYPES = {
  persistAuthenticatedSession: "persist_authenticated_session",
  seedProfileAddress: "seed_profile_address",
  walletConnected: "wallet_connected",
  profileSyncTriggered: "profile_sync_triggered",
} as const

export async function persistAuthenticatedSession(input: AuthenticatedSessionInput) {
  logRuntimeInfo({
    tag: AUTH_ORCHESTRATOR_LOG_TAG,
    component: AUTH_ORCHESTRATOR_COMPONENT,
    event: AUTH_ORCHESTRATOR_LOG_TYPES.persistAuthenticatedSession,
    message: "Persisted an authenticated session and started local state hydration.",
    details: {
      loginType: input.loginType,
      hasAddress: Boolean(input.address),
      hasPasskeyRawId: Boolean(input.passkeyRawId),
    },
  })

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

    logRuntimeInfo({
      tag: AUTH_ORCHESTRATOR_LOG_TAG,
      component: AUTH_ORCHESTRATOR_COMPONENT,
      event: AUTH_ORCHESTRATOR_LOG_TYPES.seedProfileAddress,
      message: "Seeded the cached profile with the authenticated wallet address.",
      details: {
        seededMissingAddress: true,
      },
    })
  }

  const walletState = useWalletStore.getState()
  useWalletStore.getState().setWalletState({
    status: "connected",
    address: input.address,
    chainId: walletState.chainId ?? DEFAULT_WALLET_CHAIN_ID,
  })

  logRuntimeInfo({
    tag: AUTH_ORCHESTRATOR_LOG_TAG,
    component: AUTH_ORCHESTRATOR_COMPONENT,
    event: AUTH_ORCHESTRATOR_LOG_TYPES.walletConnected,
    message: "Marked the wallet store as connected after authentication.",
    details: {
      chainId: walletState.chainId ?? DEFAULT_WALLET_CHAIN_ID,
    },
  })

  void syncCurrentUserProfile()

  logRuntimeInfo({
    tag: AUTH_ORCHESTRATOR_LOG_TAG,
    component: AUTH_ORCHESTRATOR_COMPONENT,
    event: AUTH_ORCHESTRATOR_LOG_TYPES.profileSyncTriggered,
    message: "Triggered a background profile sync after authentication.",
    details: {
      mode: "background",
    },
  })
}
