export type EntryPhase = "idle" | "collapse" | "statement" | "reveal"

export type EntryOptionKey = "create" | "import" | "watch"

export type EntryOption = {
  key: EntryOptionKey
  labelKey: string
  descriptionKey: string
  onPress: () => void
}

export type EntryVector = {
  x: number
  y: number
}

export type TrajectorySeed = {
  id: string
  anchor: EntryVector
  terminal: EntryVector
  controlBiasA: EntryVector
  controlBiasB: EntryVector
  width: number
  opacity: number
  speed: number
  delay: number
  nodeCount: 1 | 2
}
