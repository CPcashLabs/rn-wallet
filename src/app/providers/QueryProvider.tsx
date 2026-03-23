import React, { type PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"

import { getStorage } from "@/shared/storage/kvStorage"

const mmkv = getStorage()

const orderLogsPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => mmkv.getString(key) ?? null,
    setItem: (key, value) => mmkv.set(key, value),
    removeItem: (key) => mmkv.delete(key),
  },
  key: "cpcash-order-logs-cache",
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnReconnect: true,
      staleTime: 15_000,
    },
  },
})

persistQueryClient({
  queryClient,
  persister: orderLogsPersister,
  maxAge: 1000 * 60 * 60 * 24,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey
      return key[0] === "orders" && key[1] === "logs" && key[3] === "infinite"
    },
  },
})

export function QueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
