import { mapWithConcurrency } from "@/shared/async/mapWithConcurrency"

type Deferred = {
  promise: Promise<void>
  resolve: () => void
}

function createDeferred(): Deferred {
  let resolve!: () => void
  const promise = new Promise<void>(nextResolve => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve,
  }
}

describe("mapWithConcurrency", () => {
  it("preserves item order while respecting the concurrency budget", async () => {
    let active = 0
    let maxActive = 0
    const firstGate = createDeferred()
    const secondGate = createDeferred()

    const resultPromise = mapWithConcurrency([1, 2, 3, 4], 2, async value => {
      active += 1
      maxActive = Math.max(maxActive, active)

      if (value === 1) {
        await firstGate.promise
      }

      if (value === 2) {
        await secondGate.promise
      }

      active -= 1
      return value * 10
    })

    await Promise.resolve()
    expect(maxActive).toBe(2)

    firstGate.resolve()
    secondGate.resolve()

    await expect(resultPromise).resolves.toEqual([10, 20, 30, 40])
    expect(maxActive).toBe(2)
  })
})
