import { createLatestTaskController, waitForAbortableDelay } from "@/shared/async/taskController"

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
})
