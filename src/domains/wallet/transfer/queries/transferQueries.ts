import { useQuery } from "@tanstack/react-query"

import { getRecentTransferEntries, type RecentTransferEntry } from "@/domains/wallet/transfer/services/transferApi"

export type RecentTransferEntriesQueryArgs = {
  sendChainName?: string | null
  receiveChainName?: string | null
}

function normalizeRecentTransferEntriesArgs(args: RecentTransferEntriesQueryArgs) {
  return {
    sendChainName: args.sendChainName?.trim() ?? null,
    receiveChainName: args.receiveChainName?.trim() ?? null,
  }
}

export const transferKeys = {
  all: ["transfer"] as const,
  recentEntries: (args: RecentTransferEntriesQueryArgs) =>
    [...transferKeys.all, "recent-entries", normalizeRecentTransferEntriesArgs(args)] as const,
}

export async function getRecentTransferEntriesQueryData(args: RecentTransferEntriesQueryArgs): Promise<RecentTransferEntry[]> {
  return getRecentTransferEntries({
    sendChainName: args.sendChainName ?? "",
    receiveChainName: args.receiveChainName ?? "",
  })
}

export function useRecentTransferEntriesQuery(args: RecentTransferEntriesQueryArgs) {
  return useQuery({
    queryKey: transferKeys.recentEntries(args),
    queryFn: () => getRecentTransferEntriesQueryData(args),
    enabled: Boolean(args.sendChainName?.trim() && args.receiveChainName?.trim()),
    staleTime: 30_000,
    retry: false,
  })
}
