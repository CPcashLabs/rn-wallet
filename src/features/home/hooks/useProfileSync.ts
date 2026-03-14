import { useEffect, useState } from "react"

import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import {
  getProfileSyncInFlightRequest,
  hasProfileSyncHydratedThisSession,
  resetProfileSyncSession,
  runProfileSync,
} from "@/shared/session/profileSyncSession"
import { useUserStore } from "@/shared/store/useUserStore"

async function syncProfile(force = false) {
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

  useEffect(() => {
    if (hasProfileSyncHydratedThisSession() || getProfileSyncInFlightRequest()) {
      return
    }

    setIsRefreshing(true)
    void syncProfile().finally(() => {
      setIsRefreshing(false)
    })
  }, [])

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      await syncProfile(true)
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
