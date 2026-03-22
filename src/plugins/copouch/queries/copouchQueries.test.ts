import type { QueryClient } from "@tanstack/react-query"

import { copouchKeys, refreshCopouchQueriesInBackground } from "@/plugins/copouch/queries/copouchQueries"

describe("refreshCopouchQueriesInBackground", () => {
  it("starts invalidation without waiting for the refetch promise", () => {
    const invalidateQueries = jest.fn(() => new Promise(() => undefined))
    const queryClient = {
      invalidateQueries,
    } as unknown as QueryClient

    expect(refreshCopouchQueriesInBackground(queryClient)).toBeUndefined()
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: copouchKeys.all,
    })
  })
})
