import React from "react"

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppTheme } from "@/shared/theme/useAppTheme"

export function HomeScaffold(props: {
  title: string
  children: React.ReactNode
  canGoBack?: boolean
  onBack?: () => void
  right?: React.ReactNode
  scroll?: boolean
}) {
  const theme = useAppTheme()

  const content = props.scroll === false ? (
    <View style={styles.body}>{props.children}</View>
  ) : (
    <ScrollView
      bounces={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.body}
    >
      {props.children}
    </ScrollView>
  )

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <View style={styles.left}>
          {props.canGoBack ? (
            <Pressable onPress={props.onBack} style={styles.backButton}>
              <Text style={[styles.backText, { color: theme.colors.primary }]}>返回</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.title, { color: theme.colors.text }]}>{props.title}</Text>
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
