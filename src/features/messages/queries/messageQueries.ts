import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"

import {
  getMessageList,
  markAllMessagesRead,
  markMessageRead,
  type MessageItem,
} from "@/features/messages/services/messageApi"

type MessageQueryContext = {
  walletAddress?: string | null
  chainId?: string | number | null
}

type MessagePage = Awaited<ReturnType<typeof getMessageList>>

function normalizeContext(context: MessageQueryContext) {
  return {
    walletAddress: context.walletAddress ?? null,
    chainId: context.chainId ?? null,
  }
}

function isInfiniteMessageData(value: unknown): value is InfiniteData<MessagePage, number> {
  return value != null && typeof value === "object" && Array.isArray((value as InfiniteData<MessagePage, number>).pages)
}

function mapMessageItems(items: MessageItem[], updater: (item: MessageItem) => MessageItem) {
  return items.map(updater)
}

function mapMessagePage(page: MessagePage, updater: (item: MessageItem) => MessageItem): MessagePage {
  return {
    ...page,
    data: mapMessageItems(page.data, updater),
  }
}

function updateMessageCacheValue(
  value: MessagePage | InfiniteData<MessagePage, number> | MessageItem[] | undefined,
  updater: (item: MessageItem) => MessageItem,
) {
  if (!value) {
    return value
  }

  if (Array.isArray(value)) {
    return mapMessageItems(value, updater)
  }

  if (isInfiniteMessageData(value)) {
    return {
      ...value,
      pages: value.pages.map(page => mapMessagePage(page, updater)),
    }
  }

  return mapMessagePage(value, updater)
}

export const messageKeys = {
  all: ["messages"] as const,
  context: (context: MessageQueryContext) => [...messageKeys.all, normalizeContext(context)] as const,
  infinite: (context: MessageQueryContext, perPage: number) => [...messageKeys.context(context), "infinite", perPage] as const,
  preview: (context: MessageQueryContext, limit: number) => [...messageKeys.context(context), "preview", limit] as const,
}

export function useMessagesInfiniteQuery(context: MessageQueryContext, perPage = 10) {
  return useInfiniteQuery({
    queryKey: messageKeys.infinite(context, perPage),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getMessageList({ page: pageParam, perPage }),
    getNextPageParam: lastPage => (lastPage.data.length < lastPage.perPage ? undefined : lastPage.page + 1),
  })
}

export function useMessagePreviewQuery(context: MessageQueryContext, limit = 2) {
  return useQuery({
    queryKey: messageKeys.preview(context, limit),
    queryFn: async () => {
      const response = await getMessageList({ page: 1, perPage: limit })
      return response.data.slice(0, limit)
    },
  })
}

export function invalidateMessageQueries(queryClient: QueryClient, context: MessageQueryContext) {
  return queryClient.invalidateQueries({
    queryKey: messageKeys.context(context),
  })
}

export function markMessageAsReadInCache(queryClient: QueryClient, context: MessageQueryContext, id: string) {
  queryClient.setQueriesData({ queryKey: messageKeys.context(context) }, value =>
    updateMessageCacheValue(
      value as MessagePage | InfiniteData<MessagePage, number> | MessageItem[] | undefined,
      item => (item.id === id ? { ...item, status: 1 } : item),
    ),
  )
}

export function markAllMessagesAsReadInCache(queryClient: QueryClient, context: MessageQueryContext) {
  queryClient.setQueriesData({ queryKey: messageKeys.context(context) }, value =>
    updateMessageCacheValue(
      value as MessagePage | InfiniteData<MessagePage, number> | MessageItem[] | undefined,
      item => ({ ...item, status: 1 }),
    ),
  )
}

export function useMarkMessageReadMutation(queryClient: QueryClient, context: MessageQueryContext) {
  return useMutation({
    mutationFn: (id: string) => markMessageRead(id),
    onSuccess: (_, id) => {
      markMessageAsReadInCache(queryClient, context, id)
    },
  })
}

export function useMarkAllMessagesReadMutation(queryClient: QueryClient, context: MessageQueryContext) {
  return useMutation({
    mutationFn: () => markAllMessagesRead(),
    onSuccess: () => {
      markAllMessagesAsReadInCache(queryClient, context)
    },
  })
}
