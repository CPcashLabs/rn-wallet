import { create } from "zustand"

import type { UserProfile } from "@/shared/types/auth"

type UserState = {
  profile: UserProfile | null
  avatarVersion: number
  setProfile: (profile: UserProfile | null) => void
  patchProfile: (patch: Partial<UserProfile>) => void
  clearProfile: () => void
}

function normalizeAvatar(avatar?: string | null) {
  return avatar?.trim() || ""
}

function resolveAvatarVersion(currentVersion: number, prevAvatar?: string | null, nextAvatar?: string | null) {
  return normalizeAvatar(prevAvatar) === normalizeAvatar(nextAvatar) ? currentVersion : currentVersion + 1
}

export const useUserStore = create<UserState>(set => ({
  profile: null,
  avatarVersion: 0,
  setProfile: profile =>
    set(state => ({
      profile,
      avatarVersion: resolveAvatarVersion(state.avatarVersion, state.profile?.avatar, profile?.avatar),
    })),
  patchProfile: patch =>
    set(state => {
      const hasAvatarPatch = Object.prototype.hasOwnProperty.call(patch, "avatar")
      const profile = state.profile ? { ...state.profile, ...patch } : ({ ...patch } as UserProfile)

      return {
        profile,
        avatarVersion: hasAvatarPatch ? state.avatarVersion + 1 : state.avatarVersion,
      }
    }),
  clearProfile: () => set({ profile: null, avatarVersion: 0 }),
}))
