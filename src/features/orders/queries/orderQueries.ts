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

type OrderLogStatisticsQueryOptions = {
  enabled?: boolean
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
  perPage = 20,
): InfiniteData<OrderLogsPage, number> | undefined {
  if (!snapshot) {
    return undefined
  }

  const items = snapshot.items.slice(0, perPage)

  return {
    pages: [
      {
        data: items,
        total: snapshot.total,
        page: 1,
        otherAddress: otherAddress ?? "",
      },
    ],
    pageParams: [1],
  }
}

export function buildOrderLogsCacheSnapshot(
  data: InfiniteData<OrderLogsPage, unknown>,
  perPage: number,
): Omit<OrderLogsCacheSnapshot, "cachedAt"> | null {
  const firstPage = data.pages[0]
  const lastPage = data.pages[data.pages.length - 1]
  if (!firstPage || !lastPage) {
    return null
  }

  return {
    items: firstPage.data.slice(0, perPage),
    statistics: EMPTY_ORDER_STATISTICS,
    page: 1,
    total: lastPage.total,
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
    () => buildOrderLogsInfinitePlaceholderData(cachedSnapshot, args.otherAddress, perPage),
    [args.otherAddress, cachedSnapshot, perPage],
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

    const snapshot = buildOrderLogsCacheSnapshot(query.data, perPage)
    if (!snapshot) {
      return
    }

    writeOrderLogsCache(cacheKey, snapshot)
  }, [cacheKey, perPage, query.data, query.isPlaceholderData])

  return query
}

export function useOrderLogStatisticsQuery(args: OrderLogsQueryArgs, options?: OrderLogStatisticsQueryOptions) {
  return useQuery({
    queryKey: orderKeys.logsStats(args),
    queryFn: () => getOrderTxlogStatistics(args),
    enabled: options?.enabled ?? true,
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
