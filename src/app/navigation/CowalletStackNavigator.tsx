import React from "react"

import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { StyleSheet, Text, View } from "react-native"

import { CowalletDetailScreen } from "@/features/copouch/screens/CowalletDetailScreen"
import { CowalletFaqScreen } from "@/features/copouch/screens/CowalletFaqScreen"
import { CowalletHomeScreen } from "@/features/copouch/screens/CowalletHomeScreen"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { CowalletStackParamList } from "@/app/navigation/types"

const Stack = createNativeStackNavigator<CowalletStackParamList>()

function PendingScreen(props: { title: string; description: string; onBack: () => void }) {
  const theme = useAppTheme()

  return (
    <HomeScaffold canGoBack onBack={props.onBack} title={props.title} scroll={false}>
      <View style={[styles.pendingBody, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.pendingTitle, { color: theme.colors.text }]}>{props.title}</Text>
        <Text style={[styles.pendingDescription, { color: theme.colors.mutedText }]}>{props.description}</Text>
      </View>
    </HomeScaffold>
  )
}

export function CowalletStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="CowalletHomeScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CowalletHomeScreen" component={CowalletHomeScreen} />
      <Stack.Screen name="CowalletFaqScreen" component={CowalletFaqScreen} />
      <Stack.Screen name="CowalletDetailScreen" component={CowalletDetailScreen} />
      <Stack.Screen
        name="CowalletMemberScreen"
        children={({ navigation }) => <PendingScreen title="CoPouch 成员" description="成员管理会在 WP-11 补齐。" onBack={navigation.goBack} />}
      />
      <Stack.Screen
        name="CowalletSettingScreen"
        children={({ navigation }) => <PendingScreen title="CoPouch 设置" description="设置与背景编辑会在 WP-11 补齐。" onBack={navigation.goBack} />}
      />
      <Stack.Screen
        name="CowalletBillListScreen"
        children={({ navigation }) => <PendingScreen title="CoPouch 账单" description="账单与统计会在 WP-11 补齐。" onBack={navigation.goBack} />}
      />
      <Stack.Screen
        name="CowalletRemindScreen"
        children={({ navigation }) => <PendingScreen title="CoPouch 提醒" description="提醒事件列表会在 WP-11 补齐。" onBack={navigation.goBack} />}
      />
      <Stack.Screen
        name="CowalletBalanceScreen"
        children={({ navigation }) => <PendingScreen title="CoPouch 余额" description="成员余额统计会在 WP-11 补齐。" onBack={navigation.goBack} />}
      />
      <Stack.Screen
        name="CowalletSendSelfScreen"
        children={({ navigation }) => <PendingScreen title="CoPouch 转出" description="自转与分账会在 WP-11 补齐。" onBack={navigation.goBack} />}
      />
      <Stack.Screen
        name="CowalletReceiveScreen"
        children={({ navigation }) => <PendingScreen title="CoPouch 收款" description="CoPouch 专属收款分支会在 WP-11 补齐。" onBack={navigation.goBack} />}
      />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  pendingBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  pendingDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
})
