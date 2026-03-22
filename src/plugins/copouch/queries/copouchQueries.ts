import { useQuery, type QueryClient } from "@tanstack/react-query"

import {
  getCopouchAssetBreakdown,
  getCopouchBillList,
  getCopouchBillStatistics,
  getCopouchDetail,
  getCopouchMemberAccountList,
  getCopouchOverview,
  getCopouchOwners,
  getCopouchOwnersIgnoreDelete,
  getCopouchReallocateInfo,
  getCopouchWalletEvents,
  type CopouchBillItem,
  type CopouchMemberAccount,
  type CopouchOverview,
  type CopouchWallet,
} from "@/plugins/copouch/services/copouchApi"

type CopouchQueryContext = {
  walletAddress?: string | null
  chainId?: string | number | null
}

type CopouchBillQueryArgs = {
  walletId: string
  perPage?: number
  orderTypeList?: string[]
  userId?: string
}

type CopouchMemberAccountQueryArgs = {
  walletId: string
  selectSelf?: boolean
}

type CopouchEventQueryArgs = {
  walletId: string
  perPage?: number
}

type CopouchAssetBreakdownQueryArgs = {
  walletId: string
  chainId?: string | number | null
}

function normalizeContext(context: CopouchQueryContext) {
  return {
    walletAddress: context.walletAddress ?? null,
    chainId: context.chainId ?? null,
  }
}

function sortWallets(wallets: CopouchWallet[], sortByAmount: boolean) {
  return [...wallets].sort((left, right) => {
    if (sortByAmount) {
      return right.totalValue - left.totalValue
    }

    return new Date(right.createdAt || right.updatedAt || 0).getTime() - new Date(left.createdAt || left.updatedAt || 0).getTime()
  })
}

export const copouchKeys = {
  all: ["copouch"] as const,
  overview: (context: CopouchQueryContext, sortByAmount: boolean) =>
    [...copouchKeys.all, "overview", normalizeContext(context), sortByAmount ? "amount" : "time"] as const,
  detail: (walletId: string) => [...copouchKeys.all, "detail", walletId] as const,
  owners: (walletId: string) => [...copouchKeys.all, "owners", walletId] as const,
  ownersIgnoreDelete: (walletId: string) => [...copouchKeys.all, "owners-ignore-delete", walletId] as const,
  reallocateInfo: (orderSn: string) => [...copouchKeys.all, "reallocate-info", orderSn] as const,
  bills: (args: CopouchBillQueryArgs) =>
    [
      ...copouchKeys.all,
      "bills",
      {
        walletId: args.walletId,
        perPage: args.perPage ?? 40,
        orderTypeList: args.orderTypeList ?? [],
        userId: args.userId ?? null,
      },
    ] as const,
  billStats: (args: Omit<CopouchBillQueryArgs, "perPage">) =>
    [
      ...copouchKeys.all,
      "bill-stats",
      {
        walletId: args.walletId,
        orderTypeList: args.orderTypeList ?? [],
        userId: args.userId ?? null,
      },
    ] as const,
  memberAccounts: (args: CopouchMemberAccountQueryArgs) =>
    [
      ...copouchKeys.all,
      "member-accounts",
      {
        walletId: args.walletId,
        selectSelf: args.selectSelf ?? false,
      },
    ] as const,
  events: (args: CopouchEventQueryArgs) =>
    [
      ...copouchKeys.all,
      "events",
      {
        walletId: args.walletId,
        perPage: args.perPage ?? 40,
      },
    ] as const,
  assetBreakdown: (args: CopouchAssetBreakdownQueryArgs) =>
    [
      ...copouchKeys.all,
      "asset-breakdown",
      {
        walletId: args.walletId,
        chainId: args.chainId ?? null,
      },
    ] as const,
}

export function useCopouchOverviewQuery(context: CopouchQueryContext, sortByAmount: boolean) {
  return useQuery({
    queryKey: copouchKeys.overview(context, sortByAmount),
    queryFn: async () => {
      const overview = await getCopouchOverview({
        chainId: context.chainId,
        walletAddress: context.walletAddress,
      })

      return {
        ...overview,
        wallets: sortWallets(overview.wallets, sortByAmount),
      } satisfies CopouchOverview
    },
    enabled: Boolean(context.chainId && context.walletAddress),
  })
}

export function useCopouchDetailQuery(walletId: string) {
  return useQuery({
    queryKey: copouchKeys.detail(walletId),
    queryFn: () => getCopouchDetail(walletId),
    enabled: Boolean(walletId),
  })
}

export function useCopouchOwnersQuery(walletId: string) {
  return useQuery({
    queryKey: copouchKeys.owners(walletId),
    queryFn: () => getCopouchOwners(walletId),
    enabled: Boolean(walletId),
  })
}

export function useCopouchOwnersIgnoreDeleteQuery(walletId: string) {
  return useQuery({
    queryKey: copouchKeys.ownersIgnoreDelete(walletId),
    queryFn: () => getCopouchOwnersIgnoreDelete(walletId),
    enabled: Boolean(walletId),
  })
}

export function useCopouchReallocateInfoQuery(orderSn: string) {
  return useQuery({
    queryKey: copouchKeys.reallocateInfo(orderSn),
    queryFn: () => getCopouchReallocateInfo(orderSn),
    enabled: Boolean(orderSn),
  })
}

export function useCopouchBillListQuery(args: CopouchBillQueryArgs) {
  return useQuery({
    queryKey: copouchKeys.bills(args),
    queryFn: async () => {
      const response = await getCopouchBillList({
        walletId: args.walletId,
        perPage: args.perPage ?? 40,
        orderTypeList: args.orderTypeList,
        userId: args.userId,
      })
      return response.items
    },
    enabled: Boolean(args.walletId),
  })
}

export function useCopouchBillStatisticsQuery(args: Omit<CopouchBillQueryArgs, "perPage">) {
  return useQuery({
    queryKey: copouchKeys.billStats(args),
    queryFn: () =>
      getCopouchBillStatistics({
        walletId: args.walletId,
        orderTypeList: args.orderTypeList,
        userId: args.userId,
      }),
    enabled: Boolean(args.walletId),
  })
}

export function useCopouchMemberAccountsQuery(args: CopouchMemberAccountQueryArgs) {
  return useQuery({
    queryKey: copouchKeys.memberAccounts(args),
    queryFn: () =>
      getCopouchMemberAccountList({
        walletId: args.walletId,
        selectSelf: args.selectSelf,
      }),
    enabled: Boolean(args.walletId),
  })
}

export function useCopouchEventsQuery(args: CopouchEventQueryArgs) {
  return useQuery({
    queryKey: copouchKeys.events(args),
    queryFn: async () => {
      const response = await getCopouchWalletEvents({
        walletId: args.walletId,
        perPage: args.perPage ?? 40,
      })
      return response.items
    },
    enabled: Boolean(args.walletId),
  })
}

export function useCopouchAssetBreakdownQuery(args: CopouchAssetBreakdownQueryArgs) {
  return useQuery({
    queryKey: copouchKeys.assetBreakdown(args),
    queryFn: () =>
      getCopouchAssetBreakdown({
        walletId: args.walletId,
        chainId: args.chainId,
      }),
    enabled: Boolean(args.walletId && args.chainId),
  })
}

export function invalidateCopouchQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: copouchKeys.all,
  })
}

export function refreshCopouchQueriesInBackground(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: copouchKeys.all,
  })
}

export function invalidateCopouchOverviewQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: [...copouchKeys.all, "overview"],
  })
}

export function setCopouchBillListCache(
  queryClient: QueryClient,
  args: CopouchBillQueryArgs,
  items: CopouchBillItem[],
) {
  queryClient.setQueryData(copouchKeys.bills(args), items)
}

export function setCopouchMemberAccountsCache(
  queryClient: QueryClient,
  args: CopouchMemberAccountQueryArgs,
  items: CopouchMemberAccount[],
) {
  queryClient.setQueryData(copouchKeys.memberAccounts(args), items)
}
