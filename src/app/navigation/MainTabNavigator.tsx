import React from "react"

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { getFocusedRouteNameFromRoute } from "@react-navigation/native"
import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { HomeTabStackNavigator } from "@/app/navigation/HomeTabStackNavigator"
import { SettingsStackNavigator } from "@/app/navigation/SettingsStackNavigator"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppleBrandMark } from "@/shared/ui/AppleBrandMark"

import type { MainTabParamList } from "@/app/navigation/types"

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainTabNavigator() {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const baseTabBarStyle = {
    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
    borderTopWidth: 0,
    height: 74,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: theme.colors.shadow,
    shadowOpacity: theme.isDark ? 0.22 : 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 } as const,
    elevation: 8,
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedText,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: baseTabBarStyle,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <View style={{ opacity: focused ? 1 : 0.68 }}>
              <AppleBrandMark size={22} tone={focused || theme.isDark ? "dark" : "light"} />
            </View>
          ),
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 12 }}>{t("home.tabs.home")}</Text>,
        }}
      />
      <Tab.Screen
        name="MeTab"
        component={SettingsStackNavigator}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? "MeShellScreen"
          const shouldHideTabBar = focusedRouteName !== "MeShellScreen"

          return {
            title: "Me",
            tabBarIcon: ({ color, focused }) => <ProfileTabIcon color={color} focused={focused} />,
            tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 12 }}>{t("home.tabs.me")}</Text>,
            tabBarStyle: shouldHideTabBar ? { display: "none" } : baseTabBarStyle,
          }
        }}
      />
    </Tab.Navigator>
  )
}

function ProfileTabIcon(props: { color: string; focused: boolean }) {
  return (
    <View style={[styles.profileIconShell, props.focused ? { backgroundColor: `${props.color}14` } : null]}>
      <View style={[styles.profileHead, { borderColor: props.color }]} />
      <View style={[styles.profileShoulders, { borderColor: props.color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  profileIconShell: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.7,
  },
  profileShoulders: {
    width: 16,
    height: 9,
    borderRadius: 6,
    borderWidth: 1.7,
    borderTopWidth: 1.7,
    marginTop: 2,
  },
})
