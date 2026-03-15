import { beginBootstrapRun, resetBootstrapRunCoordinatorForTests } from "@/app/navigation/bootstrapRunCoordinator"

describe("beginBootstrapRun", () => {
  beforeEach(() => {
    resetBootstrapRunCoordinatorForTests()
  })

  afterEach(() => {
    resetBootstrapRunCoordinatorForTests()
  })

  it("aborts the previous run when a new run starts", () => {
    const firstRun = beginBootstrapRun()

    expect(firstRun.isCurrent()).toBe(true)
    expect(firstRun.signal.aborted).toBe(false)

    const secondRun = beginBootstrapRun()

    expect(firstRun.isCurrent()).toBe(false)
    expect(firstRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(true)
    expect(secondRun.signal.aborted).toBe(false)
  })

  it("does not let a stale cleanup cancel the latest run", () => {
    const firstRun = beginBootstrapRun()
    const secondRun = beginBootstrapRun()

    firstRun.cancel()

    expect(firstRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(true)
    expect(secondRun.signal.aborted).toBe(false)

    secondRun.cancel()

    expect(secondRun.isCurrent()).toBe(false)
    expect(secondRun.signal.aborted).toBe(true)
  })
})
