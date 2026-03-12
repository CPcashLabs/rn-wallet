import { useEffect, useState } from "react"

import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import { useUserStore } from "@/shared/store/useUserStore"

let didFetchThisSession = false
let inFlightRequest: Promise<void> | null = null

async function syncProfile(force = false) {
  if (inFlightRequest && !force) {
    return inFlightRequest
  }

  if (didFetchThisSession && !force) {
    return
  }

  didFetchThisSession = true

  let request: Promise<void> | null = null

  request = (async () => {
    try {
      const profile = await getCurrentUserProfile()
      useUserStore.getState().mergeRemoteProfile(profile)
    } catch {
      // Keep cached profile untouched when refresh fails.
    } finally {
      if (inFlightRequest === request) {
        inFlightRequest = null
      }
    }
  })()

  inFlightRequest = request
  return request
}

export function resetProfileSyncSession() {
  didFetchThisSession = false
  inFlightRequest = null
}

export function useProfileSync() {
  const profile = useUserStore(state => state.profile)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (didFetchThisSession || inFlightRequest) {
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
