import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { CopouchDetailScreen } from "@/plugins/copouch/screens/CopouchDetailScreen"
import { CopouchFaqScreen } from "@/plugins/copouch/screens/CopouchFaqScreen"
import { CopouchHomeScreen } from "@/plugins/copouch/screens/CopouchHomeScreen"
import {
  CopouchAddMemberForTeamScreen,
  CopouchAddMemberForTeamSelectScreen,
  CopouchAddMemberScreen,
  CopouchAllocationScreen,
  CopouchBalanceScreen,
  CopouchBgSettingScreen,
  CopouchBillListScreen,
  CopouchDeleteMemberScreen,
  CopouchMemberScreen,
  CopouchReceiveScreen,
  CopouchRemindScreen,
  CopouchSendSelfScreen,
  CopouchSetNameScreen,
  CopouchSettingScreen,
  CopouchViewAllocationScreen,
} from "@/plugins/copouch/screens/CopouchOperationsScreens"

import type { CopouchStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<CopouchStackParamList>()

export function CopouchStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="CopouchHomeScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CopouchHomeScreen" component={CopouchHomeScreen} />
      <Stack.Screen name="CopouchFaqScreen" component={CopouchFaqScreen} />
      <Stack.Screen name="CopouchDetailScreen" component={CopouchDetailScreen} />
      <Stack.Screen name="CopouchMemberScreen" component={CopouchMemberScreen} />
      <Stack.Screen name="CopouchDeleteMemberScreen" component={CopouchDeleteMemberScreen} />
      <Stack.Screen name="CopouchAddMemberScreen" component={CopouchAddMemberScreen} />
      <Stack.Screen name="CopouchAddMemberForTeamScreen" component={CopouchAddMemberForTeamScreen} />
      <Stack.Screen name="CopouchAddMemberForTeamSelectScreen" component={CopouchAddMemberForTeamSelectScreen} />
      <Stack.Screen name="CopouchSettingScreen" component={CopouchSettingScreen} />
      <Stack.Screen name="CopouchSetNameScreen" component={CopouchSetNameScreen} />
      <Stack.Screen name="CopouchBgSettingScreen" component={CopouchBgSettingScreen} />
      <Stack.Screen name="CopouchBillListScreen" component={CopouchBillListScreen} />
      <Stack.Screen name="CopouchRemindScreen" component={CopouchRemindScreen} />
      <Stack.Screen name="CopouchBalanceScreen" component={CopouchBalanceScreen} />
      <Stack.Screen name="CopouchSendSelfScreen" component={CopouchSendSelfScreen} />
      <Stack.Screen name="CopouchReceiveScreen" component={CopouchReceiveScreen} />
      <Stack.Screen name="CopouchAllocationScreen" component={CopouchAllocationScreen} />
      <Stack.Screen name="CopouchViewAllocationScreen" component={CopouchViewAllocationScreen} />
    </Stack.Navigator>
  )
}
