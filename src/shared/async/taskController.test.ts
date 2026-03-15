import {
  createLatestTaskController,
  createAbortError,
  isAbortLikeError,
  throwIfAborted,
  waitForAbortableDelay,
} from "@/shared/async/taskController"

describe("taskController", () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it("only allows the latest run to commit state", () => {
    const controller = createLatestTaskController()
    const committed: string[] = []
    const firstRun = controller.begin()
    const secondRun = controller.begin()

    expect(firstRun.commit(() => committed.push("first"))).toBe(false)
    expect(secondRun.commit(() => committed.push("second"))).toBe(true)
    expect(committed).toEqual(["second"])
  })

  it("aborts a pending delay when the run is cancelled", async () => {
    jest.useFakeTimers()

    const controller = createLatestTaskController()
    const run = controller.begin()
    const promise = waitForAbortableDelay(5_000, run.signal)

    run.cancel()

    await expect(promise).rejects.toMatchObject({
      name: "AbortError",
    })
    expect(jest.getTimerCount()).toBe(0)
  })

  it("handles pre-aborted signals and stale run cancellations", async () => {
    const controller = createLatestTaskController()
    const firstRun = controller.begin()
    const secondRun = controller.begin()

    const abortController = new AbortController()
    abortController.abort()

    await expect(waitForAbortableDelay(1_000, abortController.signal)).rejects.toMatchObject({
      name: "AbortError",
    })

    firstRun.cancel()
    expect(secondRun.isCurrent()).toBe(true)
  })

  it("detects abort-like errors and throws abort errors for aborted signals", () => {
    const controller = new AbortController()
    controller.abort()

    expect(() => throwIfAborted(controller.signal, "stopped")).toThrow("stopped")
    expect(() => throwIfAborted()).not.toThrow()
    expect(isAbortLikeError(createAbortError())).toBe(true)
    expect(isAbortLikeError(Object.assign(new Error("cancelled"), { name: "CanceledError" }))).toBe(true)
    expect(isAbortLikeError(Object.assign(new Error("cancelled"), { code: "ERR_CANCELED" }))).toBe(true)
    expect(isAbortLikeError(new Error("other"))).toBe(false)
    expect(isAbortLikeError("other")).toBe(false)
  })
})
