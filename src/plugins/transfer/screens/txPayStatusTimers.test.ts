import {
  resolveTxPayStatusCountdownEndAt,
  shouldDisableTxPayStatusRefresh,
  startTxPayStatusCountdown,
  startTxPayStatusPoller,
} from "@/plugins/transfer/screens/txPayStatusTimers"

describe("txPayStatusTimers", () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it("reuses an active countdown endAt and creates a new one when missing", () => {
    expect(
      resolveTxPayStatusCountdownEndAt({
        existingEndAt: 8_000,
        now: 5_000,
        shouldStart: true,
      }),
    ).toBe(8_000)

    expect(
      resolveTxPayStatusCountdownEndAt({
        durationMs: 15_000,
        existingEndAt: 4_000,
        now: 5_000,
        shouldStart: true,
      }),
    ).toBe(20_000)

    expect(
      resolveTxPayStatusCountdownEndAt({
        existingEndAt: 8_000,
        now: 5_000,
        shouldStart: false,
      }),
    ).toBeNull()
  })

  it("clears the countdown timer when the countdown expires", () => {
    jest.useFakeTimers()

    let now = 0
    const onTick = jest.fn()
    const onExpire = jest.fn()

    startTxPayStatusCountdown({
      endAt: 2_000,
      now: () => now,
      onExpire,
      onTick,
    })

    expect(onTick).toHaveBeenLastCalledWith(2_000)
    expect(jest.getTimerCount()).toBe(1)

    now = 1_000
    jest.advanceTimersByTime(1_000)
    expect(onTick).toHaveBeenLastCalledWith(1_000)
    expect(jest.getTimerCount()).toBe(1)

    now = 2_000
    jest.advanceTimersByTime(1_000)
    expect(onTick).toHaveBeenLastCalledWith(0)
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  it("allows stopping an already-cleared countdown without side effects", () => {
    jest.useFakeTimers()

    let now = 0
    const stop = startTxPayStatusCountdown({
      endAt: 0,
      now: () => now,
      onExpire: jest.fn(),
      onTick: jest.fn(),
    })

    now = 1_000
    stop()
    stop()

    expect(jest.getTimerCount()).toBe(0)
  })

  it("always polls with the latest refresh callback", () => {
    jest.useFakeTimers()

    const firstTask = jest.fn()
    const nextTask = jest.fn()
    let currentTask = firstTask

    const stop = startTxPayStatusPoller({
      getTask: () => currentTask,
      intervalMs: 1_000,
    })

    jest.advanceTimersByTime(1_000)
    expect(firstTask).toHaveBeenCalledTimes(1)

    currentTask = nextTask
    jest.advanceTimersByTime(1_000)
    expect(firstTask).toHaveBeenCalledTimes(1)
    expect(nextTask).toHaveBeenCalledTimes(1)

    stop()
    expect(jest.getTimerCount()).toBe(0)
  })

  it("disables manual refresh while loading or countdown is active", () => {
    expect(
      shouldDisableTxPayStatusRefresh({
        countdownLeft: 0,
        loading: false,
      }),
    ).toBe(false)

    expect(
      shouldDisableTxPayStatusRefresh({
        countdownLeft: 1_000,
        loading: false,
      }),
    ).toBe(true)

    expect(
      shouldDisableTxPayStatusRefresh({
        countdownLeft: 0,
        loading: true,
      }),
    ).toBe(true)
  })
})
