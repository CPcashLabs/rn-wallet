import {
  createAbortError,
  createLatestTaskController,
  isAbortLikeError,
  throwIfAborted,
  waitForAbortableDelay,
} from "@/shared/async/taskController"
import {
  getProfileSyncInFlightRequest,
  hasProfileSyncHydratedThisSession,
  resetProfileSyncSession,
  runProfileSync,
} from "@/shared/session/profileSyncSession"

describe("task controller and profile sync integration", () => {
  afterEach(() => {
    jest.useRealTimers()
    resetProfileSyncSession()
  })

  it("supports abort helpers and abortable delays", async () => {
    jest.useFakeTimers()

    const resolvedController = new AbortController()
    const resolvedDelay = waitForAbortableDelay(25, resolvedController.signal)

    jest.advanceTimersByTime(25)
    await expect(resolvedDelay).resolves.toBeUndefined()

    const abortedController = new AbortController()
    const abortedDelay = waitForAbortableDelay(25, abortedController.signal)
    abortedController.abort()

    await expect(abortedDelay).rejects.toMatchObject({
      name: "AbortError",
      message: "Task aborted.",
    })
    await expect(waitForAbortableDelay(25, abortedController.signal)).rejects.toMatchObject({
      name: "AbortError",
      message: "Task aborted.",
    })

    const customAbortError = createAbortError("custom abort")
    const canceledError = Object.assign(new Error("request canceled"), {
      name: "CanceledError",
    })
    const codeAbortError = Object.assign(new Error("request canceled"), {
      code: "ERR_CANCELED",
    })

    expect(customAbortError).toMatchObject({
      name: "AbortError",
      message: "custom abort",
    })
    expect(isAbortLikeError(customAbortError)).toBe(true)
    expect(isAbortLikeError(canceledError)).toBe(true)
    expect(isAbortLikeError(codeAbortError)).toBe(true)
    expect(isAbortLikeError(new Error("plain"))).toBe(false)
    expect(isAbortLikeError("plain")).toBe(false)

    const controller = new AbortController()
    controller.abort()

    expect(() => throwIfAborted(controller.signal, "stopped")).toThrow("stopped")
    expect(() => throwIfAborted(undefined, "ignored")).not.toThrow()
  })

  it("only commits work from the latest task run and supports cancellation", () => {
    const controller = createLatestTaskController()
    const firstRun = controller.begin()
    let committed = 0

    expect(firstRun.isCurrent()).toBe(true)

    const secondRun = controller.begin()

    expect(firstRun.signal.aborted).toBe(true)
    expect(firstRun.isCurrent()).toBe(false)
    firstRun.cancel()
    expect(firstRun.commit(() => {
      committed += 1
    })).toBe(false)

    expect(secondRun.isCurrent()).toBe(true)
    expect(secondRun.commit(() => {
      committed += 1
    })).toBe(true)
    expect(committed).toBe(1)

    secondRun.cancel()

    expect(secondRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(false)

    const thirdRun = controller.begin()
    controller.cancel()

    expect(thirdRun.signal.aborted).toBe(true)
    expect(thirdRun.commit(() => {
      committed += 1
    })).toBe(false)
    expect(committed).toBe(1)
  })

  it("deduplicates in-flight profile sync work, remembers hydration, and allows forced reruns", async () => {
    let resolveFirstRun: ((value: boolean) => void) | null = null
    const task = jest.fn(
      () =>
        new Promise<boolean>(resolve => {
          resolveFirstRun = resolve
        }),
    )

    const firstRequest = runProfileSync(task)
    const secondRequest = runProfileSync(task)

    expect(firstRequest).toBe(secondRequest)
    expect(task).toHaveBeenCalledTimes(1)
    expect(getProfileSyncInFlightRequest()).toBe(firstRequest)

    resolveFirstRun?.(true)
    await firstRequest

    expect(hasProfileSyncHydratedThisSession()).toBe(true)
    expect(getProfileSyncInFlightRequest()).toBeNull()

    const skippedTask = jest.fn(async () => false)
    await runProfileSync(skippedTask)

    expect(skippedTask).not.toHaveBeenCalled()

    const forcedTask = jest.fn(async () => false)
    await runProfileSync(forcedTask, true)

    expect(forcedTask).toHaveBeenCalledTimes(1)
    expect(hasProfileSyncHydratedThisSession()).toBe(true)
  })

  it("allows retries when sync completes without hydrating the session", async () => {
    const task = jest.fn(async () => false)

    await runProfileSync(task)
    await runProfileSync(task)

    expect(task).toHaveBeenCalledTimes(2)
    expect(hasProfileSyncHydratedThisSession()).toBe(false)
    expect(getProfileSyncInFlightRequest()).toBeNull()
  })

  it("keeps the latest forced profile sync request when an older request settles later", async () => {
    let resolveFirstRequest: ((value: boolean) => void) | null = null
    let resolveSecondRequest: ((value: boolean) => void) | null = null

    const firstRequest = runProfileSync(
      () =>
        new Promise<boolean>(resolve => {
          resolveFirstRequest = resolve
        }),
    )

    const secondRequest = runProfileSync(
      () =>
        new Promise<boolean>(resolve => {
          resolveSecondRequest = resolve
        }),
      true,
    )

    expect(getProfileSyncInFlightRequest()).toBe(secondRequest)

    resolveFirstRequest?.(false)
    await firstRequest

    expect(getProfileSyncInFlightRequest()).toBe(secondRequest)

    resolveSecondRequest?.(true)
    await secondRequest

    expect(getProfileSyncInFlightRequest()).toBeNull()
    expect(hasProfileSyncHydratedThisSession()).toBe(true)
  })
})
