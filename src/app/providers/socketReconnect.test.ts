import {
  invalidateReconnectAttempt,
  resolveReconnectDelayMs,
  scheduleReconnectAttempt,
  shouldReconnectAfterClose,
} from "@/app/providers/socketReconnect"

function runQueuedCallback(callback: (() => void) | null) {
  if (!callback) {
    throw new Error("queued reconnect callback is missing")
  }

  callback()
}

describe("socketReconnect", () => {
  it("ignores a queued reconnect callback after invalidation", () => {
    const generationRef = { current: 0 }
    const timerRef = { current: null as ReturnType<typeof setTimeout> | null }
    const onReconnect = jest.fn()
    const clearTimeoutMock = jest.fn()
    let queuedCallback: (() => void) | null = null
    const timerHandle = {} as ReturnType<typeof setTimeout>

    const scheduled = scheduleReconnectAttempt({
      delayMs: 1_500,
      timerRef,
      generationRef,
      canReconnect: () => true,
      onReconnect,
      timerApi: {
        setTimeout: ((callback: Parameters<typeof setTimeout>[0]) => {
          queuedCallback = callback as () => void
          return timerHandle
        }) as unknown as typeof setTimeout,
        clearTimeout: clearTimeoutMock as unknown as typeof clearTimeout,
      },
    })

    expect(scheduled).toBe(true)
    expect(timerRef.current).toBe(timerHandle)

    invalidateReconnectAttempt(timerRef, generationRef, {
      setTimeout,
      clearTimeout: clearTimeoutMock as typeof clearTimeout,
    })

    expect(clearTimeoutMock).toHaveBeenCalledWith(timerHandle)
    expect(timerRef.current).toBeNull()

    runQueuedCallback(queuedCallback)

    expect(onReconnect).not.toHaveBeenCalled()
  })

  it("reconnects when the queued callback is still current", () => {
    const generationRef = { current: 0 }
    const timerRef = { current: null as ReturnType<typeof setTimeout> | null }
    const onReconnect = jest.fn()
    let queuedCallback: (() => void) | null = null
    const timerHandle = {} as ReturnType<typeof setTimeout>

    const scheduled = scheduleReconnectAttempt({
      delayMs: 1_500,
      timerRef,
      generationRef,
      canReconnect: () => true,
      onReconnect,
      timerApi: {
        setTimeout: ((callback: Parameters<typeof setTimeout>[0]) => {
          queuedCallback = callback as () => void
          return timerHandle
        }) as unknown as typeof setTimeout,
        clearTimeout,
      },
    })

    expect(scheduled).toBe(true)

    runQueuedCallback(queuedCallback)

    expect(timerRef.current).toBeNull()
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it("does nothing when invalidating without an active timer", () => {
    const generationRef = { current: 0 }
    const timerRef = { current: null as ReturnType<typeof setTimeout> | null }
    const clearTimeoutMock = jest.fn()

    invalidateReconnectAttempt(timerRef, generationRef, {
      setTimeout,
      clearTimeout: clearTimeoutMock as typeof clearTimeout,
    })

    expect(generationRef.current).toBe(1)
    expect(clearTimeoutMock).not.toHaveBeenCalled()
  })

  it("does not schedule when reconnect is not allowed or a timer already exists", () => {
    const generationRef = { current: 0 }
    const timerHandle = {} as ReturnType<typeof setTimeout>
    const setTimeoutMock = jest.fn(() => timerHandle)

    expect(
      scheduleReconnectAttempt({
        delayMs: 1_500,
        timerRef: { current: null },
        generationRef,
        canReconnect: () => false,
        onReconnect: jest.fn(),
        timerApi: {
          setTimeout: setTimeoutMock as unknown as typeof setTimeout,
          clearTimeout,
        },
      }),
    ).toBe(false)

    expect(
      scheduleReconnectAttempt({
        delayMs: 1_500,
        timerRef: { current: timerHandle },
        generationRef,
        canReconnect: () => true,
        onReconnect: jest.fn(),
        timerApi: {
          setTimeout: setTimeoutMock as unknown as typeof setTimeout,
          clearTimeout,
        },
      }),
    ).toBe(false)

    expect(setTimeoutMock).not.toHaveBeenCalled()
  })

  it("uses the global timer api defaults when no timer api is provided", () => {
    jest.useFakeTimers()

    const generationRef = { current: 0 }
    const timerRef = { current: null as ReturnType<typeof setTimeout> | null }
    const onReconnect = jest.fn()

    expect(
      scheduleReconnectAttempt({
        delayMs: 1_000,
        timerRef,
        generationRef,
        canReconnect: () => true,
        onReconnect,
      }),
    ).toBe(true)

    invalidateReconnectAttempt(timerRef, generationRef)
    expect(timerRef.current).toBeNull()

    expect(
      scheduleReconnectAttempt({
        delayMs: 1_000,
        timerRef,
        generationRef,
        canReconnect: () => true,
        onReconnect,
      }),
    ).toBe(true)

    jest.advanceTimersByTime(1_000)
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it("backs off reconnect delays exponentially up to the max delay", () => {
    expect(resolveReconnectDelayMs(1)).toBe(1_500)
    expect(resolveReconnectDelayMs(2)).toBe(3_000)
    expect(resolveReconnectDelayMs(3)).toBe(6_000)
    expect(resolveReconnectDelayMs(10)).toBe(30_000)
  })

  it("stops reconnecting after repeated auth-send failures", () => {
    expect(
      shouldReconnectAfterClose({
        attempt: 1,
        reason: "auth_send_failed",
        shouldReconnect: true,
      }),
    ).toBe(true)

    expect(
      shouldReconnectAfterClose({
        attempt: 3,
        reason: "auth_send_failed",
        shouldReconnect: true,
      }),
    ).toBe(false)

    expect(
      shouldReconnectAfterClose({
        attempt: 5,
        reason: "server_closed",
        shouldReconnect: true,
      }),
    ).toBe(true)
  })
})
