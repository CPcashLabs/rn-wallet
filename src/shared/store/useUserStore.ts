import { create } from "zustand"
import { persist } from "zustand/middleware"

import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { createKvJsonStorage } from "@/shared/store/persistStorage"
import type { UserProfile } from "@/shared/types/auth"

type UserState = {
  profile: UserProfile | null
  avatarVersion: number
  mergeRemoteProfile: (profile: UserProfile) => void
  patchProfile: (patch: Partial<UserProfile>) => void
  clearProfile: () => void
}

type PersistedUserState = Pick<UserState, "profile">

function normalizeAvatar(avatar?: string | null) {
  return avatar?.trim() || ""
}

function resolveAvatarVersion(currentVersion: number, prevAvatar?: string | null, nextAvatar?: string | null) {
  return normalizeAvatar(prevAvatar) === normalizeAvatar(nextAvatar) ? currentVersion : currentVersion + 1
}

function shouldPreserveRemoteField(value: unknown) {
  if (value === null || value === undefined) {
    return true
  }

  return typeof value === "string" && value.trim() === ""
}

function mergeProfiles(current: UserProfile | null, remote: UserProfile) {
  const merged: UserProfile = { ...(current ?? {}) }
  const nextProfile = merged as Record<string, unknown>

  for (const [key, value] of Object.entries(remote) as [keyof UserProfile, UserProfile[keyof UserProfile]][]) {
    if (shouldPreserveRemoteField(value)) {
      continue
    }

    nextProfile[key] = value
  }

  return merged
}

function areProfilesEqual(left: UserProfile | null, right: UserProfile | null) {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  const keys = new Set<keyof UserProfile>([
    ...Object.keys(left),
    ...Object.keys(right),
  ] as (keyof UserProfile)[])

  for (const key of keys) {
    if (left[key] !== right[key]) {
      return false
    }
  }

  return true
}

export const useUserStore = create<UserState>()(
  persist(
    set => ({
      profile: null,
      avatarVersion: 0,
      mergeRemoteProfile: profile =>
        set(state => {
          const nextProfile = mergeProfiles(state.profile, profile)

          if (areProfilesEqual(state.profile, nextProfile)) {
            return state
          }

          return {
            profile: nextProfile,
            avatarVersion: resolveAvatarVersion(state.avatarVersion, state.profile?.avatar, nextProfile.avatar),
          }
        }),
      patchProfile: patch =>
        set(state => {
          const profile = state.profile ? { ...state.profile, ...patch } : ({ ...patch } as UserProfile)
          const hasAvatarPatch = Object.prototype.hasOwnProperty.call(patch, "avatar")

          return {
            profile,
            avatarVersion: hasAvatarPatch ? state.avatarVersion + 1 : state.avatarVersion,
          }
        }),
      clearProfile: () => set({ profile: null, avatarVersion: 0 }),
    }),
    {
      name: KvStorageKeys.UserProfile,
      storage: createKvJsonStorage<PersistedUserState>({
        migrateLegacy: raw => {
          if (typeof raw !== "object" || raw === null) {
            return null
          }

          return {
            profile: raw as UserProfile,
          }
        },
        shouldRemove: state => state.profile === null,
      }),
      partialize: state => ({
        profile: state.profile,
      }),
    },
  ),
)
