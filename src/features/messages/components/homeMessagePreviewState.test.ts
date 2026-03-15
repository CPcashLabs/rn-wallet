import { diffHomeMessagePreviewIds, pruneHomeMessagePreviewRecord } from "@/features/messages/components/homeMessagePreviewState"

describe("homeMessagePreviewState", () => {
  it("only reports inserted ids after the preview has hydrated once", () => {
    expect(diffHomeMessagePreviewIds(["1"], ["2", "1"], false)).toEqual({
      insertedIds: [],
      removedIds: [],
    })

    expect(diffHomeMessagePreviewIds(["1"], ["2", "1"], true)).toEqual({
      insertedIds: ["2"],
      removedIds: [],
    })
  })

  it("reports removed ids and prunes stale animation entries", () => {
    const record = {
      "1": { value: 1 },
      "2": { value: 2 },
      "3": { value: 3 },
    }

    expect(diffHomeMessagePreviewIds(["1", "2", "3"], ["2", "4"], true)).toEqual({
      insertedIds: ["4"],
      removedIds: ["1", "3"],
    })
    expect(pruneHomeMessagePreviewRecord(record, ["2", "4"])).toEqual({
      "2": { value: 2 },
    })
  })
})
