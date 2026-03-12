import React from "react"

import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
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
}) {
  const theme = useAppTheme()
  const backgroundColor = props.backgroundColor ?? theme.colors.background
  const headerBackgroundColor = props.headerBackgroundColor ?? theme.colors.surface
  const headerTintColor = props.headerTintColor ?? theme.colors.text

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
            <Pressable onPress={props.onBack} style={styles.backButton}>
              <Text style={[styles.backText, { color: headerTintColor }]}>返回</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.title, { color: headerTintColor }]}>{props.title}</Text>
        </View>
        <View>{props.right}</View>
      </View>
      {content}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 17,
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
