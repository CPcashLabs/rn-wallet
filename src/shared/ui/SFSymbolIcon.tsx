import React from "react"

import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Platform, requireNativeComponent } from "react-native"
import type { StyleProp, ViewStyle } from "react-native"
import type { SFSymbols3_1 } from "sf-symbols-typescript"

export type SFSymbolName = SFSymbols3_1
export type SFSymbolWeight = "ultralight" | "thin" | "light" | "regular" | "medium" | "semibold" | "bold" | "heavy" | "black"
export type SFSymbolScale = "small" | "medium" | "large"
export type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"]

type NativeSFSymbolIconProps = {
  name: SFSymbolName
  pointSize?: number
  tintColor?: string
  weight?: SFSymbolWeight
  scale?: SFSymbolScale
  style?: StyleProp<ViewStyle>
}

type SFSymbolIconProps = {
  name: SFSymbolName
  size?: number
  color?: string
  weight?: SFSymbolWeight
  scale?: SFSymbolScale
  style?: StyleProp<ViewStyle>
  fallbackName?: MaterialIconName
}

const NativeSFSymbolIconView = Platform.OS === "ios" ? requireNativeComponent<NativeSFSymbolIconProps>("CPCashSFSymbolIconView") : null

export function SFSymbolIcon({
  name,
  size = 24,
  color,
  weight = "semibold",
  scale = "medium",
  style,
  fallbackName = "help-circle",
}: SFSymbolIconProps) {
  if (Platform.OS === "ios" && NativeSFSymbolIconView) {
    return (
      <NativeSFSymbolIconView
        name={name}
        pointSize={size}
        scale={scale}
        style={[{ width: size, height: size }, style]}
        tintColor={color}
        weight={weight}
      />
    )
  }

  return <MaterialCommunityIcons color={color} name={fallbackName} size={size} style={style} />
}
