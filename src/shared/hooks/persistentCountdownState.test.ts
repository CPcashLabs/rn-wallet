import {
  calculatePersistentCountdownSecondsLeft,
  getPersistentCountdownNextDelay,
  sanitizePersistentCountdownEndAt,
} from "@/shared/hooks/persistentCountdownState"

describe("persistentCountdownState", () => {
  it("calculates seconds left from an end timestamp", () => {
    expect(calculatePersistentCountdownSecondsLeft(null, 10_000)).toBe(0)
    expect(calculatePersistentCountdownSecondsLeft(10_001, 10_000)).toBe(1)
    expect(calculatePersistentCountdownSecondsLeft(11_900, 10_000)).toBe(2)
  })

  it("drops expired or invalid end timestamps", () => {
    expect(sanitizePersistentCountdownEndAt(null, 10_000)).toBeNull()
    expect(sanitizePersistentCountdownEndAt(Number.NaN, 10_000)).toBeNull()
    expect(sanitizePersistentCountdownEndAt(9_999, 10_000)).toBeNull()
    expect(sanitizePersistentCountdownEndAt(10_500, 10_000)).toBe(10_500)
  })

  it("schedules the next tick at the next second boundary and stops at expiry", () => {
    expect(getPersistentCountdownNextDelay(15_000, 10_000)).toBe(1000)
    expect(getPersistentCountdownNextDelay(10_750, 10_000)).toBe(750)
    expect(getPersistentCountdownNextDelay(10_000, 10_000)).toBe(0)
  })
})
