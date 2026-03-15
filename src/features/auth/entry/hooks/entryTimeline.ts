import {
  ENTRY_BUTTON_REVEAL_MS,
  ENTRY_BUTTON_STAGGER_MS,
  ENTRY_COLLAPSE_DURATION_MS,
  ENTRY_REVEAL_DELAY_MS,
  ENTRY_SECOND_LINE_DELAY_MS,
} from "@/features/auth/entry/constants"

type Schedule = (task: () => void, delay: number) => void

type EntryTimelineHandlers = {
  onStatement: () => void
  onSecondLine: () => void
  onReveal: () => void
  onButtonsInteractive: () => void
}

export function scheduleEntryTimeline(schedule: Schedule, handlers: EntryTimelineHandlers) {
  schedule(handlers.onStatement, ENTRY_COLLAPSE_DURATION_MS)
  schedule(handlers.onSecondLine, ENTRY_COLLAPSE_DURATION_MS + ENTRY_SECOND_LINE_DELAY_MS)
  schedule(
    handlers.onReveal,
    ENTRY_COLLAPSE_DURATION_MS + ENTRY_SECOND_LINE_DELAY_MS + ENTRY_REVEAL_DELAY_MS,
  )
  schedule(
    handlers.onButtonsInteractive,
    ENTRY_COLLAPSE_DURATION_MS +
      ENTRY_SECOND_LINE_DELAY_MS +
      ENTRY_REVEAL_DELAY_MS +
      ENTRY_BUTTON_REVEAL_MS +
      ENTRY_BUTTON_STAGGER_MS * 2,
  )
}
