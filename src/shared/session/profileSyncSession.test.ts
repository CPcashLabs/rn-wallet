import {
  hasProfileSyncHydratedThisSession,
  resetProfileSyncSession,
  runProfileSync,
} from "@/shared/session/profileSyncSession"

describe("profileSyncSession", () => {
  beforeEach(() => {
    resetProfileSyncSession()
  })

  afterEach(() => {
    resetProfileSyncSession()
  })

  it("only marks the session hydrated after a successful sync", async () => {
    await expect(
      runProfileSync(async () => {
        throw new Error("boom")
      }),
    ).rejects.toThrow("boom")

    expect(hasProfileSyncHydratedThisSession()).toBe(false)

    await expect(runProfileSync(async () => true)).resolves.toBeUndefined()
    expect(hasProfileSyncHydratedThisSession()).toBe(true)
  })

  it("skips later non-force syncs after one successful run", async () => {
    const task = jest.fn(async () => true)

    await runProfileSync(task)
    await runProfileSync(task)

    expect(task).toHaveBeenCalledTimes(1)
  })
})
