import { useState } from "react"

import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import { isAbortLikeError, throwIfAborted } from "@/shared/async/taskController"
import { resetProfileSyncSession, runProfileSync } from "@/shared/session/profileSyncSession"
import { useUserStore } from "@/shared/store/useUserStore"

export async function syncCurrentUserProfile(force = false, signal?: AbortSignal) {
  return runProfileSync(async () => {
    try {
      throwIfAborted(signal, "Profile sync aborted.")
      const profile = await getCurrentUserProfile(signal)
      throwIfAborted(signal, "Profile sync aborted.")
      useUserStore.getState().mergeRemoteProfile(profile)
      return true
    } catch (error) {
      if (isAbortLikeError(error)) {
        return false
      }

      // Keep cached profile untouched when refresh fails.
      return false
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
