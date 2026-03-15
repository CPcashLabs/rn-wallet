import {
  getTransferConfirmRetryDelay,
  isAbortLikeError,
  waitForTransferConfirmRetry,
} from "@/plugins/transfer/components/transferConfirmRetry"

describe("transferConfirmRetry", () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it("caps the retry backoff so the total wait budget stays under thirty seconds", () => {
    const totalDelay = Array.from({ length: 9 }, (_value, index) => getTransferConfirmRetryDelay(index)).reduce(
      (sum, delay) => sum + delay,
      0,
    )

    expect(getTransferConfirmRetryDelay(0)).toBe(1500)
    expect(getTransferConfirmRetryDelay(8)).toBe(4000)
    expect(getTransferConfirmRetryDelay(9)).toBe(4000)
    expect(totalDelay).toBeLessThanOrEqual(30_000)
  })

  it("cancels a pending retry sleep when aborted", async () => {
    jest.useFakeTimers()

    const controller = new AbortController()
    const promise = waitForTransferConfirmRetry(4_000, controller.signal)

    controller.abort()

    await expect(promise).rejects.toMatchObject({
      name: "AbortError",
    })
    expect(jest.getTimerCount()).toBe(0)
  })

  it("rejects immediately when the signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(waitForTransferConfirmRetry(100, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    })
  })

  it("resolves after the requested delay when not aborted", async () => {
    jest.useFakeTimers()

    const controller = new AbortController()
    const promise = waitForTransferConfirmRetry(250, controller.signal)

    await jest.advanceTimersByTimeAsync(250)
    await expect(promise).resolves.toBeUndefined()
  })

  it("treats abort-like transport errors as cancellations", () => {
    const error = new Error("request canceled") as Error & { code?: string }
    error.name = "CanceledError"
    error.code = "ERR_CANCELED"

    expect(isAbortLikeError(error)).toBe(true)
    expect(isAbortLikeError(new Error("boom"))).toBe(false)
    expect(isAbortLikeError("boom")).toBe(false)
  })
})
