import { create } from "zustand"

import type { UserProfile } from "@/shared/types/auth"

type UserState = {
  profile: UserProfile | null
  setProfile: (profile: UserProfile | null) => void
  patchProfile: (patch: Partial<UserProfile>) => void
  clearProfile: () => void
}

export const useUserStore = create<UserState>(set => ({
  profile: null,
  setProfile: profile => set({ profile }),
  patchProfile: patch =>
    set(state => ({
      profile: state.profile ? { ...state.profile, ...patch } : ({ ...patch } as UserProfile),
    })),
  clearProfile: () => set({ profile: null }),
}))
