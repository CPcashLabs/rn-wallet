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
      <Stack.Screen name="CowalletHomeScreen" component={CopouchHomeScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchFaqScreen" component={CopouchFaqScreen} />
      <Stack.Screen name="CowalletFaqScreen" component={CopouchFaqScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchDetailScreen" component={CopouchDetailScreen} />
      <Stack.Screen name="CowalletDetailScreen" component={CopouchDetailScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchMemberScreen" component={CopouchMemberScreen} />
      <Stack.Screen name="CowalletMemberScreen" component={CopouchMemberScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchDeleteMemberScreen" component={CopouchDeleteMemberScreen} />
      <Stack.Screen name="CowalletDeleteMemberScreen" component={CopouchDeleteMemberScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchAddMemberScreen" component={CopouchAddMemberScreen} />
      <Stack.Screen name="CowalletAddMemberScreen" component={CopouchAddMemberScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchAddMemberForTeamScreen" component={CopouchAddMemberForTeamScreen} />
      <Stack.Screen name="CowalletAddMemberForTeamScreen" component={CopouchAddMemberForTeamScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchAddMemberForTeamSelectScreen" component={CopouchAddMemberForTeamSelectScreen} />
      <Stack.Screen name="CowalletAddMemberForTeamSelectScreen" component={CopouchAddMemberForTeamSelectScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchSettingScreen" component={CopouchSettingScreen} />
      <Stack.Screen name="CowalletSettingScreen" component={CopouchSettingScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchSetNameScreen" component={CopouchSetNameScreen} />
      <Stack.Screen name="CowalletSetNameScreen" component={CopouchSetNameScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchBgSettingScreen" component={CopouchBgSettingScreen} />
      <Stack.Screen name="CowalletBgSettingScreen" component={CopouchBgSettingScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchBillListScreen" component={CopouchBillListScreen} />
      <Stack.Screen name="CowalletBillListScreen" component={CopouchBillListScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchRemindScreen" component={CopouchRemindScreen} />
      <Stack.Screen name="CowalletRemindScreen" component={CopouchRemindScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchBalanceScreen" component={CopouchBalanceScreen} />
      <Stack.Screen name="CowalletBalanceScreen" component={CopouchBalanceScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchSendSelfScreen" component={CopouchSendSelfScreen} />
      <Stack.Screen name="CowalletSendSelfScreen" component={CopouchSendSelfScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchReceiveScreen" component={CopouchReceiveScreen} />
      <Stack.Screen name="CowalletReceiveScreen" component={CopouchReceiveScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchAllocationScreen" component={CopouchAllocationScreen} />
      <Stack.Screen name="CowalletAllocationScreen" component={CopouchAllocationScreen as React.ComponentType<any>} />
      <Stack.Screen name="CopouchViewAllocationScreen" component={CopouchViewAllocationScreen} />
      <Stack.Screen name="CowalletViewAllocationScreen" component={CopouchViewAllocationScreen as React.ComponentType<any>} />
    </Stack.Navigator>
  )
}
