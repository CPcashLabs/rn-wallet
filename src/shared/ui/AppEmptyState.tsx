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
    paddingHorizontal: 20,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
})
