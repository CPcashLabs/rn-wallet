import { navigateRoot } from "@/app/navigation/navigationRef"

import type { OrdersStackParamList } from "@/app/navigation/types"

export type WalletOrderDetailSource = NonNullable<OrdersStackParamList["OrderDetailScreen"]["source"]>

export function openWalletOrderDetail(input: {
  orderSn: string
  source?: WalletOrderDetailSource
}) {
  const orderSn = input.orderSn.trim()

  if (!orderSn) {
    return false
  }

  return navigateRoot("OrdersStack", {
    screen: "OrderDetailScreen",
    params: {
      orderSn,
      source: input.source ?? "manual",
    },
  })
}
