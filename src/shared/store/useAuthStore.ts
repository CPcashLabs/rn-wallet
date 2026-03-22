import { create } from "zustand"
import { persist } from "zustand/middleware"

import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { createKvJsonStorage } from "@/shared/store/persistStorage"
import type { AuthLoginType, AuthSession, PasskeyHistoryItem } from "@/shared/types/auth"

type AuthState = {
  isBootstrapped: boolean
  session: AuthSession | null
  loginType: AuthLoginType | null
  recentPasskeys: PasskeyHistoryItem[]
  setBootstrapped: (value: boolean) => void
  setSession: (session: AuthSession) => void
  setLoginType: (loginType: AuthLoginType | null) => void
  addRecentPasskey: (entry: PasskeyHistoryItem) => void
  clearRecentPasskeys: () => void
  clearSession: () => void
}

type PersistedAuthState = Pick<AuthState, "recentPasskeys">

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      isBootstrapped: false,
      session: null,
      loginType: null,
      recentPasskeys: [],
      setBootstrapped: value => set({ isBootstrapped: value }),
      setSession: session =>
        set({
          session,
          loginType: session.loginType ?? null,
        }),
      setLoginType: loginType => set({ loginType }),
      addRecentPasskey: entry =>
        set(state => {
          const deduped = state.recentPasskeys.filter(item => item.credentialId !== entry.credentialId && item.rawId !== entry.rawId)
          const next = [...deduped, entry].slice(-2)

          return {
            recentPasskeys: next,
          }
        }),
      clearRecentPasskeys: () => set({ recentPasskeys: [] }),
      clearSession: () =>
        set({
          session: null,
          loginType: null,
        }),
    }),
    {
      name: KvStorageKeys.PasskeyHistory,
      storage: createKvJsonStorage<PersistedAuthState>({
        migrateLegacy: raw => {
          if (!Array.isArray(raw)) {
            return null
          }

          return {
            recentPasskeys: raw as PasskeyHistoryItem[],
          }
        },
        shouldRemove: state => state.recentPasskeys.length === 0,
      }),
      partialize: state => ({
        recentPasskeys: state.recentPasskeys,
      }),
    },
  ),
)
