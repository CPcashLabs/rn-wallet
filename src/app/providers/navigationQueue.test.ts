import { drainQueuedNavigationUrls } from "@/app/providers/navigationQueue"

describe("navigationQueue", () => {
  it("stops draining when processing a protected url fails", () => {
    const processUrl = jest.fn(() => false)

    expect(
      drainQueuedNavigationUrls({
        canProcess: () => true,
        getPendingIncomingUrl: () => null,
        clearPendingIncomingUrl: jest.fn(),
        getPendingProtectedUrl: () => "/orders/ORDER_123",
        isAuthenticated: () => true,
        processUrl,
      }),
    ).toBe(false)

    expect(processUrl).toHaveBeenCalledWith("/orders/ORDER_123", "protected")
  })

  it("stops draining when processing an incoming url fails", () => {
    const clearPendingIncomingUrl = jest.fn()
    const processUrl = jest.fn(() => false)

    expect(
      drainQueuedNavigationUrls({
        canProcess: () => true,
        getPendingIncomingUrl: () => "/invite",
        clearPendingIncomingUrl,
        getPendingProtectedUrl: () => null,
        isAuthenticated: () => false,
        processUrl,
      }),
    ).toBe(false)

    expect(processUrl).toHaveBeenCalledWith("/invite", "incoming")
    expect(clearPendingIncomingUrl).not.toHaveBeenCalled()
  })
})
