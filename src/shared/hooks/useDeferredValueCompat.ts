import { useEffect, useRef, useState } from "react"

export function useDeferredValueCompat<T>(value: T, delay = 120) {
  const [deferredValue, setDeferredValue] = useState(value)
  const latestValueRef = useRef(value)

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  useEffect(() => {
    if (Object.is(deferredValue, value)) {
      return
    }

    const timeoutId = setTimeout(() => {
      setDeferredValue(latestValueRef.current)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [delay, deferredValue, value])

  return deferredValue
}
