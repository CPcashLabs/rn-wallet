import { useState } from "react"

import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import { resetProfileSyncSession, runProfileSync } from "@/shared/session/profileSyncSession"
import { useUserStore } from "@/shared/store/useUserStore"

export async function syncCurrentUserProfile(force = false) {
  return runProfileSync(async () => {
    try {
      const profile = await getCurrentUserProfile()
      useUserStore.getState().mergeRemoteProfile(profile)
    } catch {
      // Keep cached profile untouched when refresh fails.
    }
  }, force)
}

export { resetProfileSyncSession }

export function useProfileSync() {
  const profile = useUserStore(state => state.profile)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      await syncCurrentUserProfile(true)
    } finally {
      setIsRefreshing(false)
    }
  }

  return {
    profile,
    isRefreshing,
    refresh,
  }
}
