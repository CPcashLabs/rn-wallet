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
  const headerBackgroundColor = props.headerBackgroundColor ?? backgroundColor
  const headerTintColor = props.headerTintColor ?? theme.colors.text
  const backTintColor = props.backTintColor ?? theme.colors.primary
  const titleAlign = props.titleAlign ?? (props.canGoBack ? "center" : "left")
  const isLargeTitle = titleAlign === "left" && !props.canGoBack
  const reserveFloatingOverlayInset = props.reserveFloatingOverlayInset ?? props.scroll !== false
  const floatingBottomInset = reserveFloatingOverlayInset ? getFloatingOverlayContentInset(route.name, insets.bottom) : 0
  const contentContainerStyle = StyleSheet.flatten(props.contentContainerStyle) ?? {}
  const contentPaddingBottom = resolvePaddingBottom(contentContainerStyle)

  const content = props.scroll === false ? (
    <View style={styles.body}>
      <View style={[styles.bodyInner, contentContainerStyle, { paddingBottom: contentPaddingBottom + floatingBottomInset }]}>{props.children}</View>
    </View>
  ) : (
    <ScrollView
      bounces={false}
      contentContainerStyle={styles.scrollContainer}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={styles.body}
    >
      <View style={[styles.scrollContent, contentContainerStyle, { paddingBottom: contentPaddingBottom + floatingBottomInset }]}>{props.children}</View>
    </ScrollView>
  )

  const header = props.hideHeader ? null : titleAlign === "center" ? (
    <View
      style={[
        styles.header,
        isLargeTitle ? styles.headerLarge : null,
        {
          backgroundColor: headerBackgroundColor,
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
          backgroundColor: headerBackgroundColor,
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
            paddingTop: insets.top + 4,
            paddingBottom: 4,
            paddingLeft: insets.left + 16,
            paddingRight: insets.right + 16,
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

function resolvePaddingBottom(style: ViewStyle) {
  if (typeof style.paddingBottom === "number") {
    return style.paddingBottom
  }

  if (typeof style.paddingVertical === "number") {
    return style.paddingVertical
  }

  if (typeof style.padding === "number") {
    return style.padding
  }

  return 0
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
    minHeight: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLarge: {
    minHeight: 52,
    paddingTop: 2,
    paddingBottom: 6,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    flex: 1,
    minWidth: 0,
  },
  right: {
    marginLeft: 8,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerSide: {
    width: 88,
    minHeight: 44,
    justifyContent: "center",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingRight: 8,
  },
  backChevron: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 24,
  },
  backText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: -0.41,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
  titleLeft: {
    flex: 1,
  },
  titleCenter: {
    textAlign: "center",
  },
  titleLarge: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
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
    minHeight: 34,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextActionPlain: {
    minHeight: 44,
    paddingHorizontal: 0,
  },
  headerTextActionDisabled: {
    opacity: 0.45,
  },
  headerTextActionLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.24,
  },
  headerTextActionLabelPlain: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: -0.41,
  },
})
