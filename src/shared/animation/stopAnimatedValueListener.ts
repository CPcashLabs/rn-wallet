import { Animated } from "react-native"

export function stopAnimatedValueListener(value: Animated.Value, listenerId: string) {
  let removed = false

  const removeListener = () => {
    if (removed) {
      return
    }

    removed = true
    value.removeListener(listenerId)
  }

  try {
    value.stopAnimation(() => {
      removeListener()
    })
  } catch {
    removeListener()
  }
}
