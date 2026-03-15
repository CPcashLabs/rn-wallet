import React, { useMemo } from "react"

import { StyleSheet, View } from "react-native"
import Svg from "react-native-svg"

import { ENTRY_TRAJECTORY_COUNT } from "@/features/auth/entry/constants"
import { ChainTrajectory } from "@/features/auth/entry/components/ChainTrajectory"
import { createTrajectorySeeds } from "@/features/auth/entry/utils/trajectoryMath"

type Props = {
  width: number
  height: number
  timeMs: number
  activatedAt: number | null
}

export function ChainTrajectoryField({ width, height, timeMs, activatedAt }: Props) {
  const seeds = useMemo(() => createTrajectorySeeds(ENTRY_TRAJECTORY_COUNT), [])

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height={height} width={width}>
        {seeds.map(seed => (
          <ChainTrajectory
            key={seed.id}
            activatedAt={activatedAt}
            height={height}
            seed={seed}
            timeMs={timeMs}
            width={width}
          />
        ))}
      </Svg>
    </View>
  )
}
