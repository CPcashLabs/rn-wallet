import React, { useMemo } from "react"

import { Circle, Path } from "react-native-svg"

import {
  ENTRY_COLLAPSE_DURATION_MS,
  ENTRY_TRAJECTORY_COLOR,
  ENTRY_TRAJECTORY_SIGNAL,
} from "@/features/auth/entry/constants"
import type { TrajectorySeed } from "@/features/auth/entry/types"
import { resolveSignalTrim, resolveTrajectoryPoints } from "@/features/auth/entry/utils/trajectoryMath"

type Props = {
  seed: TrajectorySeed
  width: number
  height: number
  timeMs: number
  activatedAt: number | null
}

function cubicPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t

  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  }
}

export function ChainTrajectory({ seed, width, height, timeMs, activatedAt }: Props) {
  const driftProgress = ((timeMs / 1_000) * seed.speed + seed.delay) % 1
  const collapseProgress =
    activatedAt === null ? 0 : Math.min((timeMs - activatedAt) / ENTRY_COLLAPSE_DURATION_MS, 1)

  const pathModel = useMemo(() => {
    const points = resolveTrajectoryPoints(seed, width, height, driftProgress, collapseProgress)
    const d = [
      `M ${points.start.x.toFixed(2)} ${points.start.y.toFixed(2)}`,
      `C ${points.cp1.x.toFixed(2)} ${points.cp1.y.toFixed(2)},`,
      `${points.cp2.x.toFixed(2)} ${points.cp2.y.toFixed(2)},`,
      `${points.end.x.toFixed(2)} ${points.end.y.toFixed(2)}`,
    ].join(" ")

    return { d, points }
  }, [collapseProgress, driftProgress, height, seed, width])

  const signalTrimOne = resolveSignalTrim(((timeMs / 1_000) * (seed.speed * 1.12) + seed.delay) % 1, 0.08)
  const signalTrimTwo = resolveSignalTrim(((timeMs / 1_000) * (seed.speed * 0.96) + seed.delay) % 1, 0.56)
  const signalOnePoint = cubicPoint(
    (signalTrimOne.start + signalTrimOne.end) / 2,
    pathModel.points.start,
    pathModel.points.cp1,
    pathModel.points.cp2,
    pathModel.points.end,
  )
  const signalTwoPoint = cubicPoint(
    (signalTrimTwo.start + signalTrimTwo.end) / 2,
    pathModel.points.start,
    pathModel.points.cp1,
    pathModel.points.cp2,
    pathModel.points.end,
  )

  return (
    <>
      <Path
        d={pathModel.d}
        fill="none"
        opacity={seed.opacity}
        stroke={ENTRY_TRAJECTORY_COLOR}
        strokeWidth={seed.width}
      />
      <Circle
        cx={signalOnePoint.x}
        cy={signalOnePoint.y}
        fill={ENTRY_TRAJECTORY_SIGNAL}
        opacity={Math.min(seed.opacity + 0.2, 0.9)}
        r={Math.max(seed.width + 0.85, 1.4)}
      />
      {seed.nodeCount > 1 ? (
        <Circle
          cx={signalTwoPoint.x}
          cy={signalTwoPoint.y}
          fill={ENTRY_TRAJECTORY_SIGNAL}
          opacity={Math.min(seed.opacity + 0.12, 0.78)}
          r={Math.max(seed.width + 0.55, 1.2)}
        />
      ) : null}
    </>
  )
}
