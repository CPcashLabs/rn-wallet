import { beginBootstrapRun, resetBootstrapRunCoordinatorForTests } from "@/app/navigation/bootstrapRunCoordinator"

describe("bootstrapRunCoordinator integration", () => {
  beforeEach(() => {
    resetBootstrapRunCoordinatorForTests()
  })

  afterEach(() => {
    resetBootstrapRunCoordinatorForTests()
  })

  it("aborts the previous bootstrap run when a new run starts", () => {
    const firstRun = beginBootstrapRun()

    expect(firstRun.isCurrent()).toBe(true)
    expect(firstRun.signal.aborted).toBe(false)

    const secondRun = beginBootstrapRun()

    expect(firstRun.isCurrent()).toBe(false)
    expect(firstRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(true)
    expect(secondRun.signal.aborted).toBe(false)
  })

  it("keeps the latest bootstrap run alive when a stale run cancels itself", () => {
    const firstRun = beginBootstrapRun()
    const secondRun = beginBootstrapRun()

    firstRun.cancel()

    expect(firstRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(true)
    expect(secondRun.signal.aborted).toBe(false)

    secondRun.cancel()

    expect(secondRun.signal.aborted).toBe(true)
    expect(secondRun.isCurrent()).toBe(false)
  })
})
