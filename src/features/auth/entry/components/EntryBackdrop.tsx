import React, { useMemo } from "react"

import { StyleSheet, View } from "react-native"
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg"

import { ENTRY_BACKGROUND, ENTRY_BACKGROUND_SECONDARY } from "@/features/auth/entry/constants"

type Props = {
  width: number
  height: number
}

export function EntryBackdrop({ width, height }: Props) {
  const verticalLines = useMemo(
    () => Array.from({ length: 8 }, (_, index) => ((width * 0.1) + index * width * 0.11).toFixed(2)),
    [width],
  )
  const horizontalLines = useMemo(
    () => Array.from({ length: 7 }, (_, index) => ((height * 0.12) + index * height * 0.11).toFixed(2)),
    [height],
  )

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height={height} width={width}>
        <Defs>
          <RadialGradient cx="28%" cy="18%" id="topGlow" r="58%">
            <Stop offset="0%" stopColor="rgba(110,128,255,0.18)" />
            <Stop offset="58%" stopColor="rgba(62,76,160,0.08)" />
            <Stop offset="100%" stopColor="rgba(6,7,10,0)" />
          </RadialGradient>
          <RadialGradient cx="78%" cy="84%" id="bottomGlow" r="66%">
            <Stop offset="0%" stopColor="rgba(106,84,255,0.16)" />
            <Stop offset="62%" stopColor="rgba(50,38,114,0.06)" />
            <Stop offset="100%" stopColor="rgba(6,7,10,0)" />
          </RadialGradient>
          <RadialGradient cx="50%" cy="44%" id="coreWash" r="54%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.018)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>
        </Defs>

        <Rect fill={ENTRY_BACKGROUND} height={height} width={width} x={0} y={0} />
        <Rect fill={`url(#topGlow)`} height={height} width={width} x={0} y={0} />
        <Rect fill={`url(#bottomGlow)`} height={height} width={width} x={0} y={0} />
        <Rect fill={`url(#coreWash)`} height={height} width={width} x={0} y={0} />

        {verticalLines.map((x, index) => (
          <Line
            key={`v-${x}-${index}`}
            opacity={0.12}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 12"
            strokeWidth={1}
            x1={x}
            x2={x}
            y1={height * 0.08}
            y2={height * 0.92}
          />
        ))}

        {horizontalLines.map((y, index) => (
          <Line
            key={`h-${y}-${index}`}
            opacity={0.1}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2 16"
            strokeWidth={1}
            x1={width * 0.06}
            x2={width * 0.94}
            y1={y}
            y2={y}
          />
        ))}

        <Circle cx={width * 0.18} cy={height * 0.18} fill={ENTRY_BACKGROUND_SECONDARY} opacity={0.22} r={width * 0.14} />
        <Circle cx={width * 0.84} cy={height * 0.78} fill={ENTRY_BACKGROUND_SECONDARY} opacity={0.18} r={width * 0.18} />
      </Svg>
    </View>
  )
}
