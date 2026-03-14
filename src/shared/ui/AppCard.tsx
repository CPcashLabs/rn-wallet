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
          backgroundColor: props.backgroundColor ?? theme.colors.surface,
          borderColor: props.borderColor ?? theme.colors.border,
          borderRadius: props.radius ?? APP_CARD_RADIUS,
          padding: props.padding ?? APP_CARD_PADDING,
          gap: props.gap ?? APP_CARD_GAP,
          overflow: props.overflow ?? "visible",
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
