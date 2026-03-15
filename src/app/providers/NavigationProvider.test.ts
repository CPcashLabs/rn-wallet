import { MAX_QUEUED_NAVIGATION_DRAIN_ITERATIONS, drainQueuedNavigationUrls } from "@/app/providers/navigationQueue"

describe("drainQueuedNavigationUrls", () => {
  it("keeps pendingProtectedUrl untouched until navigation can process", () => {
    let pendingProtectedUrl = "/orders/ORDER_123"
    let pendingIncomingUrl: string | null = "/invite?code=abc"
    const processUrl = jest.fn(() => true)

    const didProcess = drainQueuedNavigationUrls({
      canProcess: () => false,
      clearPendingIncomingUrl: () => {
        pendingIncomingUrl = null
      },
      getPendingIncomingUrl: () => pendingIncomingUrl,
      getPendingProtectedUrl: () => pendingProtectedUrl,
      isAuthenticated: () => true,
      processUrl,
    })

    expect(didProcess).toBe(false)
    expect(processUrl).not.toHaveBeenCalled()
    expect(pendingProtectedUrl).toBe("/orders/ORDER_123")
    expect(pendingIncomingUrl).toBe("/invite?code=abc")
  })

  it("replays protected urls before incoming urls once navigation becomes ready", () => {
    let pendingProtectedUrl: string | null = "/orders/ORDER_123"
    let pendingIncomingUrl: string | null = "/invite?code=abc"
    const seen: Array<{ source: "incoming" | "protected"; url: string }> = []

    const didProcess = drainQueuedNavigationUrls({
      canProcess: () => true,
      clearPendingIncomingUrl: () => {
        pendingIncomingUrl = null
      },
      getPendingIncomingUrl: () => pendingIncomingUrl,
      getPendingProtectedUrl: () => pendingProtectedUrl,
      isAuthenticated: () => true,
      processUrl: (url, source) => {
        seen.push({ source, url })

        if (source === "protected") {
          pendingProtectedUrl = null
        }

        return true
      },
    })

    expect(didProcess).toBe(true)
    expect(seen).toEqual([
      { source: "protected", url: "/orders/ORDER_123" },
      { source: "incoming", url: "/invite?code=abc" },
    ])
    expect(pendingProtectedUrl).toBeNull()
    expect(pendingIncomingUrl).toBeNull()
  })

  it("does not drain protected urls before authentication succeeds", () => {
    let pendingProtectedUrl: string | null = "/orders/ORDER_123"
    let pendingIncomingUrl: string | null = null
    const processUrl = jest.fn(() => true)

    const didProcess = drainQueuedNavigationUrls({
      canProcess: () => true,
      clearPendingIncomingUrl: () => {
        pendingIncomingUrl = null
      },
      getPendingIncomingUrl: () => pendingIncomingUrl,
      getPendingProtectedUrl: () => pendingProtectedUrl,
      isAuthenticated: () => false,
      processUrl,
    })

    expect(didProcess).toBe(false)
    expect(processUrl).not.toHaveBeenCalled()
    expect(pendingProtectedUrl).toBe("/orders/ORDER_123")
  })

  it("breaks when the same protected url is re-queued during the same drain pass", () => {
    let pendingProtectedUrl: string | null = "/orders/ORDER_123"
    const processUrl = jest.fn(() => true)

    const didProcess = drainQueuedNavigationUrls({
      canProcess: () => true,
      clearPendingIncomingUrl: () => undefined,
      getPendingIncomingUrl: () => null,
      getPendingProtectedUrl: () => pendingProtectedUrl,
      isAuthenticated: () => true,
      processUrl,
    })

    expect(didProcess).toBe(true)
    expect(processUrl).toHaveBeenCalledTimes(1)
    expect(processUrl).toHaveBeenCalledWith("/orders/ORDER_123", "protected")
    expect(pendingProtectedUrl).toBe("/orders/ORDER_123")
  })

  it("caps drain iterations when protected urls keep mutating", () => {
    let sequence = 0
    let pendingProtectedUrl: string | null = `/orders/ORDER_${sequence}`
    const processUrl = jest.fn(() => {
      sequence += 1
      pendingProtectedUrl = `/orders/ORDER_${sequence}`
      return true
    })

    const didProcess = drainQueuedNavigationUrls({
      canProcess: () => true,
      clearPendingIncomingUrl: () => undefined,
      getPendingIncomingUrl: () => null,
      getPendingProtectedUrl: () => pendingProtectedUrl,
      isAuthenticated: () => true,
      processUrl,
    })

    expect(didProcess).toBe(true)
    expect(processUrl).toHaveBeenCalledTimes(MAX_QUEUED_NAVIGATION_DRAIN_ITERATIONS)
    expect(pendingProtectedUrl).toBe(`/orders/ORDER_${MAX_QUEUED_NAVIGATION_DRAIN_ITERATIONS}`)
  })
})
