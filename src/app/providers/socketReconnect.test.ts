import { invalidateReconnectAttempt, scheduleReconnectAttempt } from "@/app/providers/socketReconnect"

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
})
