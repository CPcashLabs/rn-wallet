import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { CowalletDetailScreen } from "@/features/copouch/screens/CowalletDetailScreen"
import { CowalletFaqScreen } from "@/features/copouch/screens/CowalletFaqScreen"
import { CowalletHomeScreen } from "@/features/copouch/screens/CowalletHomeScreen"
import {
  CowalletAddMemberForTeamScreen,
  CowalletAddMemberForTeamSelectScreen,
  CowalletAddMemberScreen,
  CowalletAllocationScreen,
  CowalletBalanceScreen,
  CowalletBgSettingScreen,
  CowalletBillListScreen,
  CowalletDeleteMemberScreen,
  CowalletMemberScreen,
  CowalletReceiveScreen,
  CowalletRemindScreen,
  CowalletSendSelfScreen,
  CowalletSetNameScreen,
  CowalletSettingScreen,
  CowalletViewAllocationScreen,
} from "@/features/copouch/screens/CowalletOperationsScreens"

import type { CowalletStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<CowalletStackParamList>()

export function CowalletStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="CowalletHomeScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CowalletHomeScreen" component={CowalletHomeScreen} />
      <Stack.Screen name="CowalletFaqScreen" component={CowalletFaqScreen} />
      <Stack.Screen name="CowalletDetailScreen" component={CowalletDetailScreen} />
      <Stack.Screen name="CowalletMemberScreen" component={CowalletMemberScreen} />
      <Stack.Screen name="CowalletDeleteMemberScreen" component={CowalletDeleteMemberScreen} />
      <Stack.Screen name="CowalletAddMemberScreen" component={CowalletAddMemberScreen} />
      <Stack.Screen name="CowalletAddMemberForTeamScreen" component={CowalletAddMemberForTeamScreen} />
      <Stack.Screen name="CowalletAddMemberForTeamSelectScreen" component={CowalletAddMemberForTeamSelectScreen} />
      <Stack.Screen name="CowalletSettingScreen" component={CowalletSettingScreen} />
      <Stack.Screen name="CowalletSetNameScreen" component={CowalletSetNameScreen} />
      <Stack.Screen name="CowalletBgSettingScreen" component={CowalletBgSettingScreen} />
      <Stack.Screen name="CowalletBillListScreen" component={CowalletBillListScreen} />
      <Stack.Screen name="CowalletRemindScreen" component={CowalletRemindScreen} />
      <Stack.Screen name="CowalletBalanceScreen" component={CowalletBalanceScreen} />
      <Stack.Screen name="CowalletSendSelfScreen" component={CowalletSendSelfScreen} />
      <Stack.Screen name="CowalletReceiveScreen" component={CowalletReceiveScreen} />
      <Stack.Screen name="CowalletAllocationScreen" component={CowalletAllocationScreen} />
      <Stack.Screen name="CowalletViewAllocationScreen" component={CowalletViewAllocationScreen} />
    </Stack.Navigator>
  )
}
