import React from "react"

import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppTheme } from "@/shared/theme/useAppTheme"

export function HomeScaffold(props: {
  title: string
  children: React.ReactNode
  canGoBack?: boolean
  onBack?: () => void
  right?: React.ReactNode
  scroll?: boolean
  backgroundColor?: string
  headerBackgroundColor?: string
  headerTintColor?: string
  contentContainerStyle?: StyleProp<ViewStyle>
  titleAlign?: "left" | "center"
}) {
  const { t } = useTranslation()
  const theme = useAppTheme()
  const backgroundColor = props.backgroundColor ?? theme.colors.background
  const headerBackgroundColor = props.headerBackgroundColor ?? theme.colors.surface
  const headerTintColor = props.headerTintColor ?? theme.colors.text
  const titleAlign = props.titleAlign ?? (props.canGoBack ? "center" : "left")

  const content = props.scroll === false ? (
    <View style={styles.body}>{props.children}</View>
  ) : (
    <ScrollView
      bounces={false}
      contentContainerStyle={[styles.scrollContent, props.contentContainerStyle]}
      style={styles.body}
    >
      {props.children}
    </ScrollView>
  )

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {titleAlign === "center" ? (
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.border,
              backgroundColor: headerBackgroundColor,
            },
          ]}
        >
          <View style={styles.headerSide}>
            {props.canGoBack ? (
              <Pressable hitSlop={8} onPress={props.onBack} style={styles.backButton}>
                <Text style={[styles.backText, { color: headerTintColor }]}>{t("common.back")}</Text>
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
            {
              borderBottomColor: theme.colors.border,
              backgroundColor: headerBackgroundColor,
            },
          ]}
        >
          <View style={styles.left}>
            {props.canGoBack ? (
              <Pressable hitSlop={8} onPress={props.onBack} style={styles.backButton}>
                <Text style={[styles.backText, { color: headerTintColor }]}>{t("common.back")}</Text>
              </Pressable>
            ) : null}
            <Text numberOfLines={1} style={[styles.title, styles.titleLeft, { color: headerTintColor }]}>
              {props.title}
            </Text>
          </View>
          <View style={styles.right}>{props.right}</View>
        </View>
      )}
      {content}
    </SafeAreaView>
  )
}

export function HeaderTextAction(props: {
  label: string
  onPress: () => void
  disabled?: boolean
  tone?: "primary" | "danger"
}) {
  const theme = useAppTheme()
  const color = props.tone === "danger" ? "#DC2626" : theme.colors.primary

  return (
    <Pressable
      disabled={props.disabled}
      hitSlop={8}
      onPress={props.onPress}
      style={[styles.headerTextAction, props.disabled ? styles.headerTextActionDisabled : null]}
    >
      <Text style={[styles.headerTextActionLabel, { color }]}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    minHeight: 36,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  titleLeft: {
    flex: 1,
    textAlign: "left",
  },
  titleCenter: {
    textAlign: "center",
  },
  headerTextAction: {
    minHeight: 32,
    justifyContent: "center",
  },
  headerTextActionDisabled: {
    opacity: 0.45,
  },
  headerTextActionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
})
