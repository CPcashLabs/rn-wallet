import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import {
  BillExportScreen,
  OrderBillScreen,
  TxlogsByAddressScreen,
  TxlogsScreen,
} from "@/features/orders/screens/OrderRecordsScreens"
import { LabelManagementScreen } from "@/features/orders/screens/LabelManagementScreen"
import { OrderDetailScreen } from "@/features/orders/screens/OrderDetailScreen"
import {
  DigitalReceiptScreen,
  FlowProofScreen,
  OrderVoucherScreen,
  RefundDetailScreen,
  ReimburseScreen,
  SplitDetailScreen,
} from "@/features/orders/screens/OrderFollowupScreens"
import { TagsNotesScreen } from "@/features/orders/screens/TagsNotesScreen"
import { TxPayStatusScreen } from "@/features/transfer/screens/TxPayStatusScreen"

import type { OrdersStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<OrdersStackParamList>()

export function OrdersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TxlogsScreen" component={TxlogsScreen} />
      <Stack.Screen name="TxlogsByAddressScreen" component={TxlogsByAddressScreen} />
      <Stack.Screen name="OrderDetailScreen" component={OrderDetailScreen} />
      <Stack.Screen name="SplitDetailScreen" component={SplitDetailScreen} />
      <Stack.Screen name="TxPayStatusScreen" component={TxPayStatusScreen} />
      <Stack.Screen name="OrderVoucherScreen" component={OrderVoucherScreen} />
      <Stack.Screen name="DigitalReceiptScreen" component={DigitalReceiptScreen} />
      <Stack.Screen name="FlowProofScreen" component={FlowProofScreen} />
      <Stack.Screen name="ReimburseScreen" component={ReimburseScreen} />
      <Stack.Screen name="RefundDetailScreen" component={RefundDetailScreen} />
      <Stack.Screen name="OrderBillScreen" component={OrderBillScreen} />
      <Stack.Screen name="BillExportScreen" component={BillExportScreen} />
      <Stack.Screen name="TagsNotesScreen" component={TagsNotesScreen} />
      <Stack.Screen name="TagsNotesEditScreen" component={LabelManagementScreen} />
      <Stack.Screen name="LabelManagementScreen" component={LabelManagementScreen} />
    </Stack.Navigator>
  )
}
