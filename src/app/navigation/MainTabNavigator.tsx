import React from "react"

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Text } from "react-native"
import { useTranslation } from "react-i18next"

import { HomeTabStackNavigator } from "@/app/navigation/HomeTabStackNavigator"
import { SettingsStackNavigator } from "@/app/navigation/SettingsStackNavigator"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { MainTabParamList } from "@/app/navigation/types"

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainTabNavigator() {
  const theme = useAppTheme()
  const { t } = useTranslation()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedText,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabStackNavigator}
        options={{
          title: "Home",
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 12 }}>{t("home.tabs.home")}</Text>,
        }}
      />
      <Tab.Screen
        name="MeTab"
        component={SettingsStackNavigator}
        options={{
          title: "Me",
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 12 }}>{t("home.tabs.me")}</Text>,
        }}
      />
    </Tab.Navigator>
  )
}
