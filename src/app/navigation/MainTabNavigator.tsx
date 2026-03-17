import React from "react"

import { BottomTabBarButtonProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { getFocusedRouteNameFromRoute } from "@react-navigation/native"
import { Pressable, StyleSheet, Text, View } from "react-native"
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
  const bottomSpacing = Math.max(insets.bottom - 8, 12)
  const baseTabBarStyle = {
    backgroundColor: theme.isDark ? "rgba(28,28,30,0.88)" : "rgba(255,255,255,0.94)",
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.isDark ? theme.colors.glassBorder : "rgba(255,255,255,0.92)",
    height: 74,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    borderRadius: 32,
    marginHorizontal: 18,
    marginBottom: bottomSpacing,
    overflow: "visible" as const,
    shadowColor: theme.colors.shadow,
    shadowOpacity: theme.isDark ? 0.34 : 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 } as const,
    elevation: 10,
  }
  const renderTabBarButton = (props: BottomTabBarButtonProps) => (
    <AppleTabBarButton
      {...props}
      activeBackgroundColor={theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.98)"}
      activeBorderColor={theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.92)"}
      shadowColor={theme.colors.shadow}
    />
  )

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedText,
        tabBarHideOnKeyboard: true,
        tabBarButton: renderTabBarButton,
        tabBarIconStyle: styles.tabBarIcon,
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

function AppleTabBarButton(
  props: BottomTabBarButtonProps & {
    activeBackgroundColor: string
    activeBorderColor: string
    shadowColor: string
  },
) {
  const focused = props.accessibilityState?.selected ?? false
  const { accessibilityLabel, accessibilityRole, accessibilityState, children, onLongPress, onPress, style, testID } = props

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.tabBarButton, style, pressed ? styles.tabBarButtonPressed : null]}
      testID={testID}
    >
      <View
        style={[
          styles.tabBarButtonInner,
          focused
            ? {
                backgroundColor: props.activeBackgroundColor,
                borderColor: props.activeBorderColor,
                shadowColor: props.shadowColor,
              }
            : styles.tabBarButtonInnerIdle,
          focused ? styles.tabBarButtonInnerFocused : null,
        ]}
      >
        {children}
      </View>
    </Pressable>
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
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: -0.12,
  },
  tabBarItem: {
    paddingVertical: 0,
  },
  tabBarIcon: {
    marginBottom: 2,
  },
  tabBarButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarButtonPressed: {
    opacity: 0.94,
  },
  tabBarButtonInner: {
    width: "92%",
    maxWidth: 164,
    minHeight: 56,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabBarButtonInnerIdle: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  tabBarButtonInnerFocused: {
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
