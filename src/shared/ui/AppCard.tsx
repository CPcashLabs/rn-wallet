import React from "react"

import { View, type StyleProp, type ViewStyle } from "react-native"

export { APP_CARD_GAP, APP_CARD_PADDING, APP_CARD_RADIUS, APP_LIST_ROW_MIN_HEIGHT, APP_LIST_ROW_PADDING } from "@/shared/theme/foundation"
import { useAppTheme } from "@/shared/theme/useAppTheme"

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
  const metrics = theme.components.card

  return (
    <View
      style={[
        styles.base,
        theme.shadows.card,
        {
          backgroundColor: props.backgroundColor ?? theme.colors.surfaceElevated ?? theme.colors.surface,
          borderColor: props.borderColor ?? theme.colors.border,
          borderRadius: props.radius ?? metrics.radius,
          borderWidth: metrics.borderWidth,
          padding: props.padding ?? metrics.padding,
          gap: props.gap ?? metrics.gap,
          overflow: props.overflow ?? "visible",
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  )
}

const styles = {
  base: {},
}
