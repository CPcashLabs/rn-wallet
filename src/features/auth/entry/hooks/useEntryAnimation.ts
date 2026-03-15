import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Animated, Easing } from "react-native"

import {
  ENTRY_BUTTON_REVEAL_MS,
  ENTRY_STATEMENT_FADE_MS,
} from "@/features/auth/entry/constants"
import { scheduleEntryTimeline } from "@/features/auth/entry/hooks/entryTimeline"
import type { EntryPhase } from "@/features/auth/entry/types"

const EMPHASIS_EASING = Easing.bezier(0.22, 1, 0.36, 1)

function scheduleTask(task: () => void, delay: number, bucket: ReturnType<typeof setTimeout>[]) {
  const handle = setTimeout(task, delay)
  bucket.push(handle)
}

export function useEntryAnimation() {
  const [phase, setPhase] = useState<EntryPhase>("idle")
  const [hasTriggered, setHasTriggered] = useState(false)
  const [showLine1, setShowLine1] = useState(false)
  const [showLine2, setShowLine2] = useState(false)
  const [buttonsInteractive, setButtonsInteractive] = useState(false)
  const [timeMs, setTimeMs] = useState(() => Date.now())
  const [activatedAt, setActivatedAt] = useState<number | null>(null)
  const triggeredRef = useRef(false)
  const timerHandlesRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const coreScale = useRef(new Animated.Value(1)).current
  const line1Progress = useRef(new Animated.Value(0)).current
  const line2Progress = useRef(new Animated.Value(0)).current
  const buttonRevealProgress = useRef(new Animated.Value(0)).current

  const clearTimers = useCallback(() => {
    timerHandlesRef.current.forEach(handle => clearTimeout(handle))
    timerHandlesRef.current = []
  }, [])

  useEffect(() => {
    const handle = setInterval(() => {
      setTimeMs(Date.now())
    }, 33)

    return () => {
      clearInterval(handle)
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimers()
      coreScale.stopAnimation()
      line1Progress.stopAnimation()
      line2Progress.stopAnimation()
      buttonRevealProgress.stopAnimation()
    }
  }, [buttonRevealProgress, clearTimers, coreScale, line1Progress, line2Progress])

  const trigger = useCallback(() => {
    if (triggeredRef.current) {
      return
    }

    triggeredRef.current = true
    const nextActivatedAt = Date.now()
    setHasTriggered(true)
    setPhase("collapse")
    setActivatedAt(nextActivatedAt)
    setTimeMs(nextActivatedAt)

    Animated.sequence([
      Animated.timing(coreScale, {
        toValue: 0.82,
        duration: 220,
        easing: EMPHASIS_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(coreScale, {
        toValue: 1.02,
        duration: 260,
        easing: EMPHASIS_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(coreScale, {
        toValue: 1,
        duration: 180,
        easing: EMPHASIS_EASING,
        useNativeDriver: true,
      }),
    ]).start()

    scheduleEntryTimeline(
      (task, delay) => scheduleTask(task, delay, timerHandlesRef.current),
      {
        onStatement: () => {
          setPhase("statement")
          setShowLine1(true)
          Animated.timing(line1Progress, {
            toValue: 1,
            duration: ENTRY_STATEMENT_FADE_MS,
            easing: EMPHASIS_EASING,
            useNativeDriver: true,
          }).start()
        },
        onSecondLine: () => {
          setShowLine2(true)
          Animated.timing(line2Progress, {
            toValue: 1,
            duration: ENTRY_STATEMENT_FADE_MS,
            easing: EMPHASIS_EASING,
            useNativeDriver: true,
          }).start()
        },
        onReveal: () => {
          setPhase("reveal")
          Animated.timing(buttonRevealProgress, {
            toValue: 1,
            duration: ENTRY_BUTTON_REVEAL_MS,
            easing: EMPHASIS_EASING,
            useNativeDriver: true,
          }).start()
        },
        onButtonsInteractive: () => {
          setButtonsInteractive(true)
        },
      },
    )
  }, [buttonRevealProgress, coreScale, line1Progress, line2Progress])

  const gestureEnabled = useMemo(() => !hasTriggered, [hasTriggered])

  return {
    phase,
    hasTriggered,
    showLine1,
    showLine2,
    buttonsInteractive,
    gestureEnabled,
    timeMs,
    activatedAt,
    coreScale,
    line1Progress,
    line2Progress,
    buttonRevealProgress,
    trigger,
  }
}
