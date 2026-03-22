import { useState } from "react"

import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import { isAbortLikeError, throwIfAborted } from "@/shared/async/taskController"
import { logErrorSafely, logInfoSafely } from "@/shared/logging/safeConsole"
import { resetProfileSyncSession, runProfileSync } from "@/shared/session/profileSyncSession"
import { useUserStore } from "@/shared/store/useUserStore"

const PROFILE_SYNC_LOG_TAG = "[profile.sync]"
const PROFILE_SYNC_COMPONENT = "profile.sync"
const PROFILE_SYNC_LOG_TYPES = {
  started: "started",
  completed: "completed",
  aborted: "aborted",
  failed: "failed",
} as const

export async function syncCurrentUserProfile(force = false, signal?: AbortSignal) {
  return runProfileSync(async () => {
    try {
      logInfoSafely(PROFILE_SYNC_LOG_TAG, {
        context: {
          component: PROFILE_SYNC_COMPONENT,
          event: PROFILE_SYNC_LOG_TYPES.started,
          message: "Started syncing the current user profile.",
          details: {
            force,
          },
        },
        forwardToConsole: false,
      })

      throwIfAborted(signal, "Profile sync aborted.")
      const profile = await getCurrentUserProfile(signal)
      throwIfAborted(signal, "Profile sync aborted.")
      useUserStore.getState().mergeRemoteProfile(profile)

      logInfoSafely(PROFILE_SYNC_LOG_TAG, {
        context: {
          component: PROFILE_SYNC_COMPONENT,
          event: PROFILE_SYNC_LOG_TYPES.completed,
          message: "Completed syncing the current user profile.",
          details: {
            force,
            hasAddress: Boolean(profile.address),
          },
        },
        forwardToConsole: false,
      })

      return true
    } catch (error) {
      if (isAbortLikeError(error)) {
        logInfoSafely(PROFILE_SYNC_LOG_TAG, {
          context: {
            component: PROFILE_SYNC_COMPONENT,
            event: PROFILE_SYNC_LOG_TYPES.aborted,
            message: "Stopped syncing the current user profile because the task was aborted.",
            details: {
              force,
            },
          },
          forwardToConsole: false,
        })
        return false
      }

      logErrorSafely(PROFILE_SYNC_LOG_TAG, error, {
        context: {
          component: PROFILE_SYNC_COMPONENT,
          event: PROFILE_SYNC_LOG_TYPES.failed,
          message: "Swallowed a profile sync failure and kept the cached profile unchanged.",
          details: {
            force,
          },
        },
        forwardToConsole: false,
      })

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
