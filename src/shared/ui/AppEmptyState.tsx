import React from "react"

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

type AppEmptyStateProps = {
  title: string
  body: string
  minHeight?: number
  style?: StyleProp<ViewStyle>
}

export const AppEmptyState = React.memo(function AppEmptyState(props: AppEmptyStateProps) {
  const theme = useAppTheme()

  return (
    <View style={[styles.container, { minHeight: props.minHeight ?? 180 }, props.style]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{props.title}</Text>
      <Text style={[styles.body, { color: theme.colors.mutedText }]}>{props.body}</Text>
    </View>
  )
})

AppEmptyState.displayName = "AppEmptyState"

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.25,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
})
