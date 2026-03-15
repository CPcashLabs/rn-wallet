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
import {
  FAQGuideDetailScreen,
  FAQScreen,
  HelpCenterScreen,
  KnowledgeGuideDetailScreen,
  ReceiveDiffScreen,
  SafetyGuideDetailScreen,
  UserGuideScreen,
  WalletGuideDetailScreen,
} from "@/features/settings/screens/SettingsHelpScreens"
import { TagsNotesScreen } from "@/features/orders/screens/TagsNotesScreen"
import { TxPayStatusScreen } from "@/plugins/transfer/screens/TxPayStatusScreen"

import type { OrdersStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<OrdersStackParamList>()

export function OrdersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TxlogsScreen" component={TxlogsScreen} />
      <Stack.Screen name="TxlogsByAddressScreen" component={TxlogsByAddressScreen} />
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
      <Stack.Screen name="FAQScreen" component={FAQScreen} />
      <Stack.Screen name="ReceiveDiffScreen" component={ReceiveDiffScreen} />
      <Stack.Screen name="UserGuideScreen" component={UserGuideScreen} />
      <Stack.Screen name="WalletGuideDetailScreen" component={WalletGuideDetailScreen} />
      <Stack.Screen name="FAQGuideDetailScreen" component={FAQGuideDetailScreen} />
      <Stack.Screen name="KnowledgeGuideDetailScreen" component={KnowledgeGuideDetailScreen} />
      <Stack.Screen name="SafetyGuideDetailScreen" component={SafetyGuideDetailScreen} />
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
