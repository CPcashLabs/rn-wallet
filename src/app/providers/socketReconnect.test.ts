const mockLogInfoSafely = jest.fn()

jest.mock("@/shared/logging/safeConsole", () => ({
  logInfoSafely: (...args: unknown[]) => mockLogInfoSafely(...args),
}))

import { invalidateReconnectAttempt, scheduleReconnectAttempt } from "@/app/providers/socketReconnect"

function runQueuedCallback(callback: (() => void) | null) {
  if (!callback) {
    throw new Error("queued reconnect callback is missing")
  }

  callback()
}

describe("socketReconnect", () => {
  beforeEach(() => {
    mockLogInfoSafely.mockReset()
  })

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
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.reconnect]", {
      context: {
        component: "socket.reconnect",
        event: "invalidate_attempt",
        message: "Invalidated the pending socket reconnect attempt.",
        details: {
          hadTimer: true,
          generation: 1,
        },
      },
      forwardToConsole: false,
    })

    runQueuedCallback(queuedCallback)

    expect(onReconnect).not.toHaveBeenCalled()
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.reconnect]", {
      context: {
        component: "socket.reconnect",
        event: "skip_reconnect_callback",
        message: "Skipped the queued reconnect callback because it was no longer valid.",
        details: {
          reason: "stale_generation",
          generation: 1,
        },
      },
      forwardToConsole: false,
    })
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
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.reconnect]", {
      context: {
        component: "socket.reconnect",
        event: "execute_reconnect",
        message: "Executed the queued reconnect callback.",
        details: {
          generation: 0,
        },
      },
      forwardToConsole: false,
    })
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
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.reconnect]", {
      context: {
        component: "socket.reconnect",
        event: "invalidate_attempt",
        message: "Invalidated the pending socket reconnect attempt.",
        details: {
          hadTimer: false,
          generation: 1,
        },
      },
      forwardToConsole: false,
    })
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
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.reconnect]", {
      context: {
        component: "socket.reconnect",
        event: "skip_schedule",
        message: "Skipped scheduling a reconnect because reconnecting is currently blocked.",
        details: {
          reason: "reconnect_blocked",
          generation: 0,
        },
      },
      forwardToConsole: false,
    })
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.reconnect]", {
      context: {
        component: "socket.reconnect",
        event: "skip_schedule",
        message: "Skipped scheduling a reconnect because a timer is already active.",
        details: {
          reason: "timer_exists",
          generation: 0,
        },
      },
      forwardToConsole: false,
    })
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
    expect(mockLogInfoSafely).toHaveBeenCalledWith("[socket.reconnect]", {
      context: {
        component: "socket.reconnect",
        event: "schedule_attempt",
        message: "Scheduled a socket reconnect attempt.",
        details: {
          delayMs: 1000,
          generation: 1,
        },
      },
      forwardToConsole: false,
    })
  })
})
