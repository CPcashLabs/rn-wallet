export type QueuedUrlSource = "incoming" | "protected"
export const MAX_QUEUED_NAVIGATION_DRAIN_ITERATIONS = 20

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
  let iterations = 0
  const seenProtectedUrls = new Set<string>()

  while (canProcess() && iterations < MAX_QUEUED_NAVIGATION_DRAIN_ITERATIONS) {
    iterations += 1

    const protectedUrl = isAuthenticated() ? getPendingProtectedUrl() : null
    if (protectedUrl) {
      if (seenProtectedUrls.has(protectedUrl)) {
        break
      }

      if (!processUrl(protectedUrl, "protected")) {
        break
      }

      seenProtectedUrls.add(protectedUrl)
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
