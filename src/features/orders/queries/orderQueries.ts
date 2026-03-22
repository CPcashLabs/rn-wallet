import { useEffect, useMemo } from "react"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"

import {
  confirmOrder,
  findOrderLabels,
  getOrderBillAddresses,
  getOrderBillStatistics,
  buildOrderLogsCacheKey,
  getOrderDetail,
  getOrderTxlogs,
  getOrderTxlogStatistics,
  readOrderLogsCache,
  type OrderBillAddressItem,
  type OrderDetail,
  type OrderLabelBinding,
  type OrderStatistics,
  type OrderTypeFilter,
  type RangeQuery,
  writeOrderLogsCache,
} from "@/features/orders/services/ordersApi"

type OrderLogsQueryArgs = {
  otherAddress?: string
  orderType?: OrderTypeFilter
} & RangeQuery

type OrderLogsPage = Awaited<ReturnType<typeof getOrderTxlogs>>

type OrderBillSummary = {
  statistics: OrderStatistics
  items: OrderBillAddressItem[]
}

type OrderLogsCacheSnapshot = NonNullable<ReturnType<typeof readOrderLogsCache>>

export type OrderDetailQueryData = {
  detail: OrderDetail
  labelBinding: OrderLabelBinding
}

export const EMPTY_ORDER_LABEL_BINDING: OrderLabelBinding = {
  notes: "",
  notesImageUrl: "",
  labels: [],
}

const EMPTY_ORDER_STATISTICS: OrderStatistics = {
  receiptAmount: 0,
  paymentAmount: 0,
  fee: 0,
  transactions: 0,
}

function normalizeRange(range: RangeQuery) {
  return {
    startedAt: range.startedAt ?? null,
    endedAt: range.endedAt ?? null,
    startedTimestamp: range.startedTimestamp ?? null,
    endedTimestamp: range.endedTimestamp ?? null,
  }
}

function normalizeOrderLogsArgs(args: OrderLogsQueryArgs) {
  return {
    otherAddress: args.otherAddress ?? null,
    orderType: args.orderType ?? null,
    ...normalizeRange(args),
  }
}

function resolveLabelBinding(detail: OrderDetail, binding?: OrderLabelBinding | null): OrderLabelBinding {
  if (binding) {
    return binding
  }

  return {
    notes: detail.note,
    notesImageUrl: detail.notesImageUrl,
    labels: [],
  }
}

export const orderKeys = {
  all: ["orders"] as const,
  logs: (args: OrderLogsQueryArgs) => [...orderKeys.all, "logs", normalizeOrderLogsArgs(args)] as const,
  logsInfinite: (args: OrderLogsQueryArgs, perPage: number) => [...orderKeys.logs(args), "infinite", perPage] as const,
  logsStats: (args: OrderLogsQueryArgs) => [...orderKeys.logs(args), "stats"] as const,
  bill: (range: RangeQuery) => [...orderKeys.all, "bill", normalizeRange(range)] as const,
  detail: (orderSn: string) => [...orderKeys.all, "detail", orderSn] as const,
}

export function flattenOrderLogPages(data?: InfiniteData<OrderLogsPage, unknown>) {
  return data?.pages.flatMap(page => page.data) ?? []
}

export function buildOrderLogsInfinitePlaceholderData(
  snapshot: OrderLogsCacheSnapshot | null,
  otherAddress?: string,
): InfiniteData<OrderLogsPage, number> | undefined {
  if (!snapshot) {
    return undefined
  }

  return {
    pages: [
      {
        data: snapshot.items,
        total: snapshot.total,
        page: snapshot.page,
        otherAddress: otherAddress ?? "",
      },
    ],
    pageParams: [snapshot.page],
  }
}

export function getNextOrderLogsPageParam(lastPage: OrderLogsPage, allPages: OrderLogsPage[]) {
  const loadedItemCount = allPages.reduce((count, page) => count + page.data.length, 0)
  return loadedItemCount < lastPage.total ? lastPage.page + 1 : undefined
}

export function useOrderLogsInfiniteQuery(args: OrderLogsQueryArgs, perPage = 20) {
  const cacheKey = useMemo(() => buildOrderLogsCacheKey(args), [args])
  const cachedSnapshot = useMemo(() => readOrderLogsCache(cacheKey), [cacheKey])
  const placeholderData = useMemo(
    () => buildOrderLogsInfinitePlaceholderData(cachedSnapshot, args.otherAddress),
    [args.otherAddress, cachedSnapshot],
  )
  const query = useInfiniteQuery({
    queryKey: orderKeys.logsInfinite(args, perPage),
    initialPageParam: 1,
    placeholderData,
    queryFn: ({ pageParam }) =>
      getOrderTxlogs({
        ...args,
        page: pageParam,
        perPage,
      }),
    getNextPageParam: getNextOrderLogsPageParam,
  })

  useEffect(() => {
    if (!query.data || query.isPlaceholderData) {
      return
    }

    const items = flattenOrderLogPages(query.data)
    const lastPage = query.data.pages[query.data.pages.length - 1]
    if (!lastPage) {
      return
    }

    writeOrderLogsCache(cacheKey, {
      items,
      statistics: EMPTY_ORDER_STATISTICS,
      page: lastPage.page,
      total: lastPage.total,
    })
  }, [cacheKey, query.data, query.isPlaceholderData])

  return query
}

export function useOrderLogStatisticsQuery(args: OrderLogsQueryArgs) {
  return useQuery({
    queryKey: orderKeys.logsStats(args),
    queryFn: () => getOrderTxlogStatistics(args),
  })
}

export function useOrderBillSummaryQuery(range: RangeQuery) {
  return useQuery({
    queryKey: orderKeys.bill(range),
    queryFn: async () => {
      const [statistics, addresses] = await Promise.all([
        getOrderBillStatistics(range),
        getOrderBillAddresses(range),
      ])

      return {
        statistics,
        items: addresses.data,
      } satisfies OrderBillSummary
    },
  })
}

export function useOrderDetailQuery(orderSn: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderSn),
    queryFn: async () => {
      const [detail, binding] = await Promise.all([
        getOrderDetail(orderSn),
        findOrderLabels(orderSn).catch(() => null),
      ])

      return {
        detail,
        labelBinding: resolveLabelBinding(detail, binding),
      } satisfies OrderDetailQueryData
    },
    enabled: Boolean(orderSn),
  })
}

export function invalidateOrderQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: orderKeys.all,
  })
}

export function useConfirmOrderMutation(queryClient: QueryClient, orderSn: string) {
  return useMutation({
    mutationFn: () => confirmOrder(orderSn),
    onSuccess: async () => {
      await invalidateOrderQueries(queryClient)
    },
  })
}
