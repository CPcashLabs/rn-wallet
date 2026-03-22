import React from "react"

import { useRoute } from "@react-navigation/native"
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import { getFloatingOverlayContentInset } from "@/shared/ui/floatingInsets"
import { SFSymbolIcon } from "@/shared/ui/SFSymbolIcon"

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
  headerBorderColor?: string
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
  const headerBorderColor = props.headerBorderColor
  const headerTintColor = props.headerTintColor ?? theme.colors.text
  const backTintColor = props.backTintColor ?? theme.colors.primary
  const scaffoldMetrics = theme.components.scaffold
  const titleAlign = props.titleAlign ?? (props.canGoBack ? "center" : "left")
  const isLargeTitle = titleAlign === "left" && !props.canGoBack
  const reserveFloatingOverlayInset = props.reserveFloatingOverlayInset ?? props.scroll !== false
  const floatingBottomInset = reserveFloatingOverlayInset ? getFloatingOverlayContentInset(route.name, insets.bottom) : 0
  const contentContainerStyle = StyleSheet.flatten(props.contentContainerStyle) ?? {}
  const contentPaddingBottom = resolvePaddingBottom(contentContainerStyle)

  const content = props.scroll === false ? (
    <View style={styles.body}>
      <View
        style={[
          styles.bodyInner,
          {
            paddingHorizontal: scaffoldMetrics.contentPaddingX,
          },
          contentContainerStyle,
          { paddingBottom: contentPaddingBottom + floatingBottomInset },
        ]}
      >
        {props.children}
      </View>
    </View>
  ) : (
    <ScrollView
      bounces={false}
      contentContainerStyle={styles.scrollContainer}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={styles.body}
    >
      <View
        style={[
          styles.scrollContent,
          {
            paddingHorizontal: scaffoldMetrics.contentPaddingX,
          },
          contentContainerStyle,
          { paddingBottom: contentPaddingBottom + floatingBottomInset },
        ]}
      >
        {props.children}
      </View>
    </ScrollView>
  )

  const header = props.hideHeader ? null : titleAlign === "center" ? (
    <View
      style={[
        styles.header,
        isLargeTitle ? styles.headerLarge : null,
        {
          minHeight: isLargeTitle ? scaffoldMetrics.headerLargeMinHeight : scaffoldMetrics.headerMinHeight,
          backgroundColor: headerBackgroundColor,
          borderBottomColor: headerBorderColor,
          borderBottomWidth: headerBorderColor ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <View style={[styles.headerSide, { width: scaffoldMetrics.headerSideWidth, minHeight: scaffoldMetrics.headerMinHeight }]}>
        {props.canGoBack ? (
          <Pressable hitSlop={8} onPress={props.onBack} style={styles.backButton}>
            <SFSymbolIcon color={backTintColor} fallbackName="chevron-left" name="chevron.backward" size={18} weight="semibold" />
            <Text style={[styles.backText, theme.typography.body, { color: backTintColor }]}>{t("common.back")}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.headerCenter}>
        <Text numberOfLines={1} style={[styles.title, theme.typography.headline, styles.titleCenter, { color: headerTintColor }]}>
          {props.title}
        </Text>
      </View>
      <View style={[styles.headerSide, styles.headerSideRight, { width: scaffoldMetrics.headerSideWidth, minHeight: scaffoldMetrics.headerMinHeight }]}>
        {props.right}
      </View>
    </View>
  ) : (
    <View
      style={[
        styles.header,
        isLargeTitle ? styles.headerLarge : null,
        {
          minHeight: isLargeTitle ? scaffoldMetrics.headerLargeMinHeight : scaffoldMetrics.headerMinHeight,
          backgroundColor: headerBackgroundColor,
          borderBottomColor: headerBorderColor,
          borderBottomWidth: headerBorderColor ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <View style={styles.left}>
        {props.canGoBack ? (
          <Pressable hitSlop={8} onPress={props.onBack} style={styles.backButton}>
            <SFSymbolIcon color={backTintColor} fallbackName="chevron-left" name="chevron.backward" size={18} weight="semibold" />
            <Text style={[styles.backText, theme.typography.body, { color: backTintColor }]}>{t("common.back")}</Text>
          </Pressable>
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            isLargeTitle ? theme.typography.largeTitle : theme.typography.headline,
            isLargeTitle ? styles.titleLarge : null,
            styles.titleLeft,
            { color: headerTintColor },
          ]}
        >
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
            paddingTop: insets.top + scaffoldMetrics.topInsetOffset,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        />
      ) : (
        <View
          style={{
            backgroundColor,
            paddingTop: insets.top + scaffoldMetrics.topInsetOffset,
            paddingBottom: scaffoldMetrics.headerBottomInset,
            paddingLeft: insets.left + theme.layout.screenPadding,
            paddingRight: insets.right + theme.layout.screenPadding,
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
          minHeight: theme.components.headerAction.minHeight,
          minWidth: theme.components.headerAction.minWidth,
          paddingHorizontal: variant === "plain" ? 0 : theme.components.headerAction.paddingX,
          borderRadius: theme.components.headerAction.pillRadius,
          backgroundColor: variant === "plain" ? "transparent" : backgroundColor,
        },
        props.disabled ? styles.headerTextActionDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.headerTextActionLabel,
          variant === "plain" ? theme.typography.body : theme.typography.subheadlineEmphasized,
          variant === "plain" ? styles.headerTextActionLabelPlain : null,
          {
            color,
          },
        ]}
      >
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
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLarge: {
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
    gap: 4,
    paddingRight: 8,
  },
  backText: {
  },
  title: {
  },
  titleLeft: {
    flex: 1,
  },
  titleCenter: {
    textAlign: "center",
  },
  titleLarge: {
  },
  body: {
    flex: 1,
  },
  bodyInner: {
    flex: 1,
  },
  scrollContainer: {
    minHeight: "100%",
  },
  scrollContent: {
  },
  headerTextAction: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextActionPlain: {
  },
  headerTextActionDisabled: {
    opacity: 0.45,
  },
  headerTextActionLabel: {
  },
  headerTextActionLabelPlain: {
  },
})
