import React from "react"

import { StyleSheet, View } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppEmptyState } from "@/shared/ui/AppEmptyState"

export function PlaceholderScreen(props: { title: string; description: string }) {
  const theme = useAppTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppEmptyState body={props.description} minHeight={0} title={props.title} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
})
