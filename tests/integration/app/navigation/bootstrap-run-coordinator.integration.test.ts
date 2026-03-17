import { createLatestTaskController } from "@/shared/async/taskController"

describe("bootstrap run task controller integration", () => {
  function beginBootstrapRun() {
    return createLatestTaskController().begin()
  }

  it("aborts the previous bootstrap run when a new run starts", () => {
    const controller = createLatestTaskController()
    const firstRun = controller.begin()

    expect(firstRun.isCurrent()).toBe(true)
    expect(firstRun.signal.aborted).toBe(false)

    const secondRun = controller.begin()

    expect(firstRun.isCurrent()).toBe(false)
    expect(firstRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(true)
    expect(secondRun.signal.aborted).toBe(false)
  })

  it("keeps the latest bootstrap run alive when a stale run cancels itself", () => {
    const controller = createLatestTaskController()
    const firstRun = controller.begin()
    const secondRun = controller.begin()

    firstRun.cancel()

    expect(firstRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(true)
    expect(secondRun.signal.aborted).toBe(false)

    secondRun.cancel()

    expect(secondRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(false)
  })
})
