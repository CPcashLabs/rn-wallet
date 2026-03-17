import React from "react"

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { getFocusedRouteNameFromRoute } from "@react-navigation/native"
import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { HomeTabStackNavigator } from "@/app/navigation/HomeTabStackNavigator"
import { SettingsStackNavigator } from "@/app/navigation/SettingsStackNavigator"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { MainTabParamList } from "@/app/navigation/types"

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainTabNavigator() {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const baseTabBarStyle = {
    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    height: 52 + Math.max(insets.bottom, 8),
    paddingTop: 6,
    paddingBottom: Math.max(insets.bottom, 8),
    borderRadius: 0,
    overflow: "visible" as const,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 } as const,
    elevation: 0,
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
          tabBarIcon: ({ color, focused }) => <HomeTabIcon color={color} focused={focused} />,
          tabBarLabel: ({ color }) => <Text style={[styles.tabBarLabel, { color }]}>{t("home.tabs.home")}</Text>,
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
            tabBarLabel: ({ color }) => <Text style={[styles.tabBarLabel, { color }]}>{t("home.tabs.me")}</Text>,
            tabBarStyle: shouldHideTabBar ? { display: "none" } : baseTabBarStyle,
          }
        }}
      />
    </Tab.Navigator>
  )
}

function ProfileTabIcon(props: { color: string; focused: boolean }) {
  return (
    <View style={[styles.profileIconShell, { opacity: props.focused ? 1 : 0.84 }]}>
      <View style={[styles.profileHead, { borderColor: props.color }]} />
      <View style={[styles.profileShoulders, { borderColor: props.color }]} />
    </View>
  )
}

function HomeTabIcon(props: { color: string; focused: boolean }) {
  return (
    <View style={[styles.homeIconShell, { opacity: props.focused ? 1 : 0.84 }]}>
      <View style={[styles.homeRoofLeft, { backgroundColor: props.color }]} />
      <View style={[styles.homeRoofRight, { backgroundColor: props.color }]} />
      <View style={[styles.homeBody, { borderColor: props.color }]} />
      <View style={[styles.homeDoor, { backgroundColor: props.color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  tabBarItem: {
    paddingVertical: 3,
  },
  homeIconShell: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  homeRoofLeft: {
    position: "absolute",
    width: 10,
    height: 2,
    borderRadius: 2,
    top: 8,
    left: 4,
    transform: [{ rotate: "-38deg" }],
  },
  homeRoofRight: {
    position: "absolute",
    width: 10,
    height: 2,
    borderRadius: 2,
    top: 8,
    right: 4,
    transform: [{ rotate: "38deg" }],
  },
  homeBody: {
    position: "absolute",
    width: 12,
    height: 9,
    left: 7,
    top: 11,
    borderWidth: 1.7,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2.5,
    borderBottomRightRadius: 2.5,
  },
  homeDoor: {
    position: "absolute",
    width: 3,
    height: 5,
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
    left: 11.5,
    top: 15,
  },
  profileIconShell: {
    width: 24,
    height: 24,
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
