let didFetchProfileThisSession = false
let inFlightProfileSync: Promise<void> | null = null

export function hasProfileSyncHydratedThisSession() {
  return didFetchProfileThisSession
}

export function getProfileSyncInFlightRequest() {
  return inFlightProfileSync
}

export function runProfileSync(task: () => Promise<void>, force = false) {
  if (inFlightProfileSync && !force) {
    return inFlightProfileSync
  }

  if (didFetchProfileThisSession && !force) {
    return Promise.resolve()
  }

  didFetchProfileThisSession = true

  const request = task().finally(() => {
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
}
