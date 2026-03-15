import React from "react"

import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

export const APP_CARD_RADIUS = 18
export const APP_CARD_PADDING = 16
export const APP_CARD_GAP = 12
export const APP_LIST_ROW_MIN_HEIGHT = 56
export const APP_LIST_ROW_PADDING = 16

type AppCardProps = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  padding?: number
  gap?: number
  radius?: number
  overflow?: ViewStyle["overflow"]
  backgroundColor?: string
  borderColor?: string
}

export function AppCard(props: AppCardProps) {
  const theme = useAppTheme()

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: props.backgroundColor ?? theme.colors.surfaceElevated ?? theme.colors.surface,
          borderColor: props.borderColor ?? theme.colors.border,
          borderRadius: props.radius ?? 28,
          padding: props.padding ?? 18,
          gap: props.gap ?? APP_CARD_GAP,
          overflow: props.overflow ?? "visible",
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.18 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 3,
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
  },
})
