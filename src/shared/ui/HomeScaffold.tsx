import React from "react"

import { useRoute } from "@react-navigation/native"
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import { getFloatingOverlayContentInset } from "@/shared/ui/floatingInsets"

export function HomeScaffold(props: {
  title: string
  children: React.ReactNode
  canGoBack?: boolean
  onBack?: () => void
  right?: React.ReactNode
  hideHeader?: boolean
  scroll?: boolean
  backgroundColor?: string
  headerBackgroundColor?: string
  headerTintColor?: string
  backTintColor?: string
  contentContainerStyle?: StyleProp<ViewStyle>
  titleAlign?: "left" | "center"
  reserveFloatingOverlayInset?: boolean
}) {
  const { t } = useTranslation()
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const route = useRoute()
  const backgroundColor = props.backgroundColor ?? theme.colors.background
  const headerBackgroundColor = props.headerBackgroundColor ?? theme.colors.glassStrong ?? theme.colors.surfaceElevated ?? theme.colors.surface
  const headerTintColor = props.headerTintColor ?? theme.colors.text
  const backTintColor = props.backTintColor ?? theme.colors.primary
  const titleAlign = props.titleAlign ?? (props.canGoBack ? "center" : "left")
  const isLargeTitle = titleAlign === "left" && !props.canGoBack
  const reserveFloatingOverlayInset = props.reserveFloatingOverlayInset ?? props.scroll !== false
  const floatingBottomInset = reserveFloatingOverlayInset ? getFloatingOverlayContentInset(route.name, insets.bottom) : 0

  const content = props.scroll === false ? (
    <View style={styles.body}>
      <View style={[styles.bodyInner, { paddingBottom: floatingBottomInset }, props.contentContainerStyle]}>{props.children}</View>
    </View>
  ) : (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.scrollContainer, { paddingBottom: floatingBottomInset }]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={styles.body}
    >
      <View style={[styles.scrollContent, props.contentContainerStyle]}>{props.children}</View>
    </ScrollView>
  )

  const header = props.hideHeader ? null : titleAlign === "center" ? (
    <View
      style={[
        styles.header,
        isLargeTitle ? styles.headerLarge : null,
        {
          borderColor: theme.colors.glassBorder ?? theme.colors.border,
          backgroundColor: headerBackgroundColor,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.16 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
      ]}
    >
      <View style={styles.headerSide}>
        {props.canGoBack ? (
          <Pressable hitSlop={8} onPress={props.onBack} style={styles.backButton}>
            <Text style={[styles.backChevron, { color: backTintColor }]}>‹</Text>
            <Text style={[styles.backText, { color: backTintColor }]}>{t("common.back")}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.headerCenter}>
        <Text numberOfLines={1} style={[styles.title, styles.titleCenter, { color: headerTintColor }]}>
          {props.title}
        </Text>
      </View>
      <View style={[styles.headerSide, styles.headerSideRight]}>{props.right}</View>
    </View>
  ) : (
    <View
      style={[
        styles.header,
        isLargeTitle ? styles.headerLarge : null,
        {
          borderColor: theme.colors.glassBorder ?? theme.colors.border,
          backgroundColor: headerBackgroundColor,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.16 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
      ]}
    >
      <View style={styles.left}>
        {props.canGoBack ? (
          <Pressable hitSlop={8} onPress={props.onBack} style={styles.backButton}>
            <Text style={[styles.backChevron, { color: backTintColor }]}>‹</Text>
            <Text style={[styles.backText, { color: backTintColor }]}>{t("common.back")}</Text>
          </Pressable>
        ) : null}
        <Text numberOfLines={1} style={[styles.title, isLargeTitle ? styles.titleLarge : null, styles.titleLeft, { color: headerTintColor }]}>
          {props.title}
        </Text>
      </View>
      <View style={styles.right}>{props.right}</View>
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor }]}>
      {props.hideHeader ? (
        <View
          style={{
            backgroundColor,
            paddingTop: insets.top + 4,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        />
      ) : (
        <View
          style={{
            backgroundColor,
            paddingTop: insets.top + 8,
            paddingBottom: 6,
            paddingLeft: insets.left + 12,
            paddingRight: insets.right + 12,
          }}
        >
          {header}
        </View>
      )}
      <SafeAreaView edges={["left", "right", "bottom"]} style={[styles.safeArea, { backgroundColor }]}>
        {content}
      </SafeAreaView>
    </View>
  )
}

export function HeaderTextAction(props: {
  label: string
  onPress: () => void
  disabled?: boolean
  tone?: "primary" | "danger"
  variant?: "pill" | "plain"
}) {
  const theme = useAppTheme()
  const variant = props.variant ?? "pill"
  const color = props.tone === "danger" ? theme.colors.danger : theme.colors.primary
  const backgroundColor = props.tone === "danger" ? theme.colors.dangerSoft : theme.colors.primarySoft ?? `${theme.colors.primary}14`

  return (
    <Pressable
      disabled={props.disabled}
      hitSlop={8}
      onPress={props.onPress}
      style={[
        styles.headerTextAction,
        variant === "plain" ? styles.headerTextActionPlain : null,
        {
          backgroundColor: variant === "plain" ? "transparent" : backgroundColor,
        },
        props.disabled ? styles.headerTextActionDisabled : null,
      ]}
    >
      <Text style={[styles.headerTextActionLabel, variant === "plain" ? styles.headerTextActionLabelPlain : null, { color }]}>
        {props.label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLarge: {
    minHeight: 64,
    paddingTop: 8,
    paddingBottom: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    flex: 1,
    minWidth: 0,
  },
  right: {
    marginLeft: 12,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerSide: {
    width: 96,
    minHeight: 44,
    justifyContent: "center",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    marginRight: 4,
  },
  backChevron: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 26,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  titleLeft: {
    flex: 1,
  },
  titleCenter: {
    textAlign: "center",
  },
  titleLarge: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  body: {
    flex: 1,
  },
  bodyInner: {
    flex: 1,
    paddingHorizontal: 18,
  },
  scrollContainer: {
    minHeight: "100%",
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
  headerTextAction: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextActionPlain: {
    minHeight: 28,
    paddingHorizontal: 0,
  },
  headerTextActionDisabled: {
    opacity: 0.45,
  },
  headerTextActionLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  headerTextActionLabelPlain: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
})
