# Data Fetching Conventions

## Purpose

Establish consistent patterns for server state management using TanStack React Query. Consistent query key structure prevents cache collisions, enables precise invalidation, and makes query relationships easy to follow.

Violations of the query key rule are detected automatically by `scripts/verify-conventions.mjs` and block `npm run lint`.

---

## Query Key Factory (Required)

Every module that owns server queries must define a typed key factory object. Query keys must never be written as inline string literal arrays.

### Required pattern

```typescript
// src/features/orders/queries/orderKeys.ts

const orderKeys = {
  all: ["orders"] as const,
  detail: (orderSn: string) => [...orderKeys.all, "detail", orderSn] as const,
  logsInfinite: (args: OrderLogsArgs, perPage: number) =>
    [...orderKeys.all, "logs", args, perPage] as const,
  bill: (range: DateRange) => [...orderKeys.all, "bill", range] as const,
}

export { orderKeys }
```

```typescript
// usage
useQuery({
  queryKey: orderKeys.detail(orderSn),
  queryFn: () => fetchOrderDetail(orderSn),
})
```

### Prohibited pattern

```typescript
// ✗ — bare string literal array, not allowed
useQuery({
  queryKey: ["orders", "detail", orderSn],
  queryFn: () => fetchOrderDetail(orderSn),
})
```

The inline form bypasses the factory and makes it impossible to invalidate related queries reliably from other call sites.

---

## File Placement

Place key factories and query functions together in a `queries/` directory inside the owning module:

```
src/features/orders/
  queries/
    orderKeys.ts       ← key factory only
    orderQueries.ts    ← useQuery / useInfiniteQuery / useMutation functions

src/shared/queries/
  balanceKeys.ts
  balanceQueries.ts
```

Keep key factories in their own file when the module has more than one query function, so the factory can be imported independently for invalidation.

---

## Key Hierarchy Convention

Structure keys hierarchically from broad to narrow. This enables React Query's partial-match invalidation:

```typescript
const orderKeys = {
  all: ["orders"] as const,                                    // scope: everything in orders
  list: (filters: Filters) => [...orderKeys.all, "list", filters] as const,  // scope: filtered lists
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,         // scope: single record
}

// Invalidate all order queries after a mutation
queryClient.invalidateQueries({ queryKey: orderKeys.all })

// Invalidate only the detail for one order
queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderSn) })
```

---

## Spreading the All Key

Extending the `.all` key with an additional literal suffix is allowed when a factory method would add no value:

```typescript
// allowed — extends factory key
queryKey: [...copouchKeys.all, "overview"]
```

This pattern is accepted by the automated check.

---

## QueryClient Configuration

Global defaults are set in `src/app/providers/AppProviders.tsx`:

| Option | Value | Reason |
|---|---|---|
| `staleTime` | 15 000 ms | Prevents redundant refetches on repeated mounts |
| `retry` | 1 | Avoids repeated failed requests on transient errors |
| `refetchOnReconnect` | `true` | Keeps data fresh after a connectivity gap |

Do not override these defaults per query without a documented reason.

---

## Real-time Invalidation via WebSocket

The WebSocket message handler invalidates specific query key scopes when the server pushes an update. Follow this pattern when adding new invalidation:

```typescript
// src/shared/session/websocketRouter.ts (or equivalent)

case "balance.updated":
  queryClient.invalidateQueries({ queryKey: balanceKeys.all })
  break

case "message.received":
  queryClient.invalidateQueries({ queryKey: messageKeys.context(context) })
  break
```

Always use the factory key, not a literal, so invalidation stays in sync with the query definition.

---

## Enforcement

The convention check runs as part of `npm run check:conventions`, which is included in `npm run lint`.

To run the check in isolation:

```sh
node scripts/verify-conventions.mjs
```

A violation looks like:

```
Convention violations:
- src/plugins/copouch/screens/CopouchAllocationScreens.tsx:39  bare query key: queryKey: ["orders", ...
```

Fix by extracting a key factory in the owning module's `queries/` directory and replacing the literal.
