export type QueuedUrlSource = "incoming" | "protected"

type DrainQueuedNavigationUrlsParams = {
  canProcess: () => boolean
  getPendingIncomingUrl: () => string | null
  clearPendingIncomingUrl: () => void
  getPendingProtectedUrl: () => string | null
  isAuthenticated: () => boolean
  processUrl: (url: string, source: QueuedUrlSource) => boolean
}

export function drainQueuedNavigationUrls({
  canProcess,
  getPendingIncomingUrl,
  clearPendingIncomingUrl,
  getPendingProtectedUrl,
  isAuthenticated,
  processUrl,
}: DrainQueuedNavigationUrlsParams) {
  let didProcess = false

  while (canProcess()) {
    const protectedUrl = isAuthenticated() ? getPendingProtectedUrl() : null
    if (protectedUrl) {
      if (!processUrl(protectedUrl, "protected")) {
        break
      }

      didProcess = true
      continue
    }

    const incomingUrl = getPendingIncomingUrl()
    if (!incomingUrl) {
      break
    }

    if (!processUrl(incomingUrl, "incoming")) {
      break
    }

    clearPendingIncomingUrl()
    didProcess = true
  }

  return didProcess
}
