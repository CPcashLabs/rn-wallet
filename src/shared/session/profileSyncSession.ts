import { logRuntimeInfo } from "@/shared/logging/appLogger"

let didFetchProfileThisSession = false
let inFlightProfileSync: Promise<void> | null = null
const PROFILE_SYNC_SESSION_LOG_TAG = "[profile.sync.session]"
const PROFILE_SYNC_SESSION_COMPONENT = "profile.sync.session"
const PROFILE_SYNC_SESSION_LOG_TYPES = {
  reuseInflightRequest: "reuse_inflight_request",
  skipHydratedSession: "skip_hydrated_session",
  startRequest: "start_request",
  finishRequest: "finish_request",
  reset: "reset",
} as const

export function hasProfileSyncHydratedThisSession() {
  return didFetchProfileThisSession
}

export function getProfileSyncInFlightRequest() {
  return inFlightProfileSync
}

export function runProfileSync(task: () => Promise<boolean>, force = false) {
  if (inFlightProfileSync && !force) {
    logRuntimeInfo({
      tag: PROFILE_SYNC_SESSION_LOG_TAG,
      component: PROFILE_SYNC_SESSION_COMPONENT,
      event: PROFILE_SYNC_SESSION_LOG_TYPES.reuseInflightRequest,
      message: "Reused the in-flight profile sync request.",
      details: {
        force: false,
      },
    })
    return inFlightProfileSync
  }

  if (didFetchProfileThisSession && !force) {
    logRuntimeInfo({
      tag: PROFILE_SYNC_SESSION_LOG_TAG,
      component: PROFILE_SYNC_SESSION_COMPONENT,
      event: PROFILE_SYNC_SESSION_LOG_TYPES.skipHydratedSession,
      message: "Skipped profile sync because the session is already hydrated.",
      details: {
        force: false,
      },
    })
    return Promise.resolve()
  }

  logRuntimeInfo({
    tag: PROFILE_SYNC_SESSION_LOG_TAG,
    component: PROFILE_SYNC_SESSION_COMPONENT,
    event: PROFILE_SYNC_SESSION_LOG_TYPES.startRequest,
    message: "Started a profile sync session request.",
    details: {
      force,
    },
  })

  const request = task()
    .then(didHydrate => {
      didFetchProfileThisSession = didFetchProfileThisSession || didHydrate

      logRuntimeInfo({
        tag: PROFILE_SYNC_SESSION_LOG_TAG,
        component: PROFILE_SYNC_SESSION_COMPONENT,
        event: PROFILE_SYNC_SESSION_LOG_TYPES.finishRequest,
        message: "Finished a profile sync session request.",
        details: {
          force,
          didHydrate,
        },
      })
    })
    .finally(() => {
      if (inFlightProfileSync === request) {
        inFlightProfileSync = null
      }
    })

  inFlightProfileSync = request
  return request
}

export function resetProfileSyncSession() {
  didFetchProfileThisSession = false
  inFlightProfileSync = null

  logRuntimeInfo({
    tag: PROFILE_SYNC_SESSION_LOG_TAG,
    component: PROFILE_SYNC_SESSION_COMPONENT,
    event: PROFILE_SYNC_SESSION_LOG_TYPES.reset,
    message: "Reset the profile sync session state.",
  })
}
