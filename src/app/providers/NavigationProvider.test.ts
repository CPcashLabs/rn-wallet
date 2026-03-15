import { drainQueuedNavigationUrls } from "@/app/providers/navigationQueue"

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
})
