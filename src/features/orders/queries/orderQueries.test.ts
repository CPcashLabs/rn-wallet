import type { InfiniteData, QueryClient } from "@tanstack/react-query"

import { buildOrderLogsInfinitePlaceholderData, flattenOrderLogPages, getNextOrderLogsPageParam, invalidateOrderQueries, orderKeys } from "@/features/orders/queries/orderQueries"

type OrderLogsPage = {
  data: Array<{ orderSn: string }>
  total: number
  page: number
  otherAddress: string
}

describe("orderQueries", () => {
  it("flattens infinite order log pages in order", () => {
    const data = {
      pages: [
        {
          data: [{ orderSn: "ORDER_1" }, { orderSn: "ORDER_2" }] as never,
          total: 3,
          page: 1,
          otherAddress: "",
        },
        {
          data: [{ orderSn: "ORDER_3" }] as never,
          total: 3,
          page: 2,
          otherAddress: "",
        },
      ],
      pageParams: [1, 2],
    } satisfies InfiniteData<OrderLogsPage, number>

    expect(flattenOrderLogPages(data as never)).toEqual([
      { orderSn: "ORDER_1" },
      { orderSn: "ORDER_2" },
      { orderSn: "ORDER_3" },
    ])
  })

  it("computes the next page only while more items remain", () => {
    expect(
      getNextOrderLogsPageParam(
        {
          data: [{ orderSn: "ORDER_1" }, { orderSn: "ORDER_2" }] as never,
          total: 5,
          page: 1,
          otherAddress: "",
        },
        [
          {
            data: [{ orderSn: "ORDER_1" }, { orderSn: "ORDER_2" }] as never,
            total: 5,
            page: 1,
            otherAddress: "",
          },
        ],
      ),
    ).toBe(2)

    expect(
      getNextOrderLogsPageParam(
        {
          data: [{ orderSn: "ORDER_3" }, { orderSn: "ORDER_4" }, { orderSn: "ORDER_5" }] as never,
          total: 5,
          page: 2,
          otherAddress: "",
        },
        [
          {
            data: [{ orderSn: "ORDER_1" }, { orderSn: "ORDER_2" }] as never,
            total: 5,
            page: 1,
            otherAddress: "",
          },
          {
            data: [{ orderSn: "ORDER_3" }, { orderSn: "ORDER_4" }, { orderSn: "ORDER_5" }] as never,
            total: 5,
            page: 2,
            otherAddress: "",
          },
        ],
      ),
    ).toBeUndefined()
  })

  it("builds placeholder infinite data from the persisted order logs snapshot", () => {
    expect(
      buildOrderLogsInfinitePlaceholderData(
        {
          items: [{ orderSn: "ORDER_9" }] as never,
          statistics: {
            paymentAmount: 0,
            receiptAmount: 0,
            fee: 0,
            transactions: 1,
          },
          page: 3,
          total: 21,
          cachedAt: 1,
        },
        "T_OTHER",
      ),
    ).toEqual({
      pages: [
        {
          data: [{ orderSn: "ORDER_9" }],
          total: 21,
          page: 3,
          otherAddress: "T_OTHER",
        },
      ],
      pageParams: [3],
    })
  })

  it("invalidates all order queries from the root key", async () => {
    const invalidateQueries = jest.fn(() => Promise.resolve())
    const queryClient = {
      invalidateQueries,
    } as unknown as QueryClient

    await invalidateOrderQueries(queryClient)

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: orderKeys.all,
    })
  })
})

export {}
