import React from "react"

import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import { useAppTheme } from "@/shared/theme/useAppTheme"

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
  contentContainerStyle?: StyleProp<ViewStyle>
  titleAlign?: "left" | "center"
}) {
  const { t } = useTranslation()
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const backgroundColor = props.backgroundColor ?? theme.colors.background
  const headerBackgroundColor = props.headerBackgroundColor ?? theme.colors.surfaceElevated ?? theme.colors.surface
  const headerTintColor = props.headerTintColor ?? theme.colors.text
  const backTintColor = theme.colors.primary
  const titleAlign = props.titleAlign ?? (props.canGoBack ? "center" : "left")
  const isLargeTitle = titleAlign === "left" && !props.canGoBack
  const contentOpacity = React.useRef(new Animated.Value(0)).current
  const contentTranslateY = React.useRef(new Animated.Value(10)).current
  const hasAnimatedInRef = React.useRef(false)

  React.useEffect(() => {
    if (hasAnimatedInRef.current) {
      contentOpacity.setValue(1)
      contentTranslateY.setValue(0)
      return
    }

    hasAnimatedInRef.current = true
    contentOpacity.setValue(0)
    contentTranslateY.setValue(10)

    const animation = Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ])

    animation.start()

    return () => {
      animation.stop()
    }
  }, [contentOpacity, contentTranslateY])

  const animatedContentStyle = {
    opacity: contentOpacity,
    transform: [{ translateY: contentTranslateY }],
  }

  const content = props.scroll === false ? (
    <View style={styles.body}>
      <Animated.View style={[styles.bodyInner, animatedContentStyle]}>{props.children}</Animated.View>
    </View>
  ) : (
    <ScrollView
      bounces={false}
      contentContainerStyle={styles.scrollContainer}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={styles.body}
    >
      <Animated.View style={[styles.scrollContent, animatedContentStyle, props.contentContainerStyle]}>{props.children}</Animated.View>
    </ScrollView>
  )

  const header = props.hideHeader ? null : titleAlign === "center" ? (
    <View
      style={[
        styles.header,
        isLargeTitle ? styles.headerLarge : null,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: headerBackgroundColor,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.16 : 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
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
          borderBottomColor: theme.colors.border,
          backgroundColor: headerBackgroundColor,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.16 : 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
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
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        />
      ) : (
        <View
          style={{
            backgroundColor: headerBackgroundColor,
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
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
}) {
  const theme = useAppTheme()
  const color = props.tone === "danger" ? "#DC2626" : theme.colors.primary

  return (
    <Pressable
      disabled={props.disabled}
      hitSlop={8}
      onPress={props.onPress}
      style={[
        styles.headerTextAction,
        {
          backgroundColor: theme.colors.primarySoft ?? `${theme.colors.primary}14`,
        },
        props.disabled ? styles.headerTextActionDisabled : null,
      ]}
    >
      <Text style={[styles.headerTextActionLabel, { color }]}>{props.label}</Text>
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
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLarge: {
    minHeight: 72,
    paddingTop: 10,
    paddingBottom: 12,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backChevron: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "400",
    marginTop: -1,
  },
  backText: {
    fontSize: 14,
    fontWeight: "500",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  titleLeft: {
    flex: 1,
    textAlign: "left",
  },
  titleLarge: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
    fontWeight: "700",
  },
  titleCenter: {
    textAlign: "center",
  },
  headerTextAction: {
    minHeight: 32,
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  headerTextActionDisabled: {
    opacity: 0.45,
  },
  headerTextActionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  bodyInner: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
})
