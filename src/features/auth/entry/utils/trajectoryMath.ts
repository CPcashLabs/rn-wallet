import type { EntryVector, TrajectorySeed } from "@/features/auth/entry/types"

function clamp(value: number, min: number, max: number) {
  "worklet"
  return Math.min(max, Math.max(min, value))
}

function mix(start: number, end: number, progress: number) {
  "worklet"
  return start + (end - start) * progress
}

function mixVector(start: EntryVector, end: EntryVector, progress: number): EntryVector {
  "worklet"
  return {
    x: mix(start.x, end.x, progress),
    y: mix(start.y, end.y, progress),
  }
}

function edgeAnchor(index: number, random: () => number): EntryVector {
  const side = index % 4

  if (side === 0) {
    return { x: random(), y: -0.14 - random() * 0.12 }
  }

  if (side === 1) {
    return { x: 1.14 + random() * 0.12, y: random() }
  }

  if (side === 2) {
    return { x: random(), y: 1.14 + random() * 0.12 }
  }

  return { x: -0.14 - random() * 0.12, y: random() }
}

function mulberry32(seed: number) {
  let current = seed

  return () => {
    current |= 0
    current = (current + 0x6d2b79f5) | 0
    let result = Math.imul(current ^ (current >>> 15), 1 | current)
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function createTrajectorySeeds(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const random = mulberry32(index * 91 + 17)
    const driftA = random()
    const driftB = random()

    return {
      id: `trajectory-${index}`,
      anchor: edgeAnchor(index, random),
      terminal: {
        x: 0.28 + random() * 0.44,
        y: 0.24 + random() * 0.5,
      },
      controlBiasA: {
        x: 0.16 + driftA * 0.68,
        y: 0.14 + random() * 0.72,
      },
      controlBiasB: {
        x: 0.18 + driftB * 0.64,
        y: 0.18 + random() * 0.64,
      },
      width: 0.9 + random() * 1.35,
      opacity: 0.11 + random() * 0.18,
      speed: 0.055 + random() * 0.05,
      delay: random(),
      nodeCount: random() > 0.56 ? 2 : 1,
    } satisfies TrajectorySeed
  })
}

function toPoint(value: EntryVector, width: number, height: number) {
  "worklet"
  return {
    x: value.x * width,
    y: value.y * height,
  }
}

export function resolveTrajectoryPoints(
  seed: TrajectorySeed,
  width: number,
  height: number,
  driftProgress: number,
  collapseProgress: number,
) {
  "worklet"
  const center = {
    x: width * 0.5,
    y: height * 0.42,
  }

  const swirl = driftProgress * Math.PI * 2 + seed.delay * Math.PI
  const driftRadius = 8 + seed.width * 5
  const start = toPoint(seed.anchor, width, height)
  const end = toPoint(seed.terminal, width, height)
  const cp1 = toPoint(seed.controlBiasA, width, height)
  const cp2 = toPoint(seed.controlBiasB, width, height)

  const driftedCp1 = {
    x: cp1.x + Math.cos(swirl) * driftRadius,
    y: cp1.y + Math.sin(swirl * 1.15) * driftRadius * 1.2,
  }
  const driftedCp2 = {
    x: cp2.x + Math.sin(swirl * 0.9) * driftRadius * 1.15,
    y: cp2.y + Math.cos(swirl * 1.25) * driftRadius,
  }

  return {
    start: mixVector(start, center, clamp(collapseProgress * 0.88, 0, 1)),
    cp1: mixVector(driftedCp1, center, clamp(collapseProgress * 0.92, 0, 1)),
    cp2: mixVector(driftedCp2, center, clamp(collapseProgress * 0.95, 0, 1)),
    end: mixVector(end, center, clamp(collapseProgress, 0, 1)),
  }
}

export function resolveSignalTrim(progress: number, offset: number, length = 0.05) {
  "worklet"
  const start = (progress + offset) % 1
  const end = clamp(start + length, 0, 1)

  return {
    start,
    end,
  }
}
