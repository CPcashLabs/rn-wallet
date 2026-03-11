import { create } from "zustand"

import { getJson, removeItem, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
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

function readRecentPasskeys() {
  return getJson<PasskeyHistoryItem[]>(KvStorageKeys.PasskeyHistory) ?? []
}

export const useAuthStore = create<AuthState>(set => ({
  isBootstrapped: false,
  session: null,
  loginType: null,
  recentPasskeys: readRecentPasskeys(),
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
      setJson(KvStorageKeys.PasskeyHistory, next)

      return {
        recentPasskeys: next,
      }
    }),
  clearRecentPasskeys: () => {
    removeItem(KvStorageKeys.PasskeyHistory)
    set({ recentPasskeys: [] })
  },
  clearSession: () =>
    set({
      session: null,
      loginType: null,
    }),
}))
