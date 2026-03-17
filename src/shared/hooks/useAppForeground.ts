import React from "react"

import { AppState } from "react-native"

export function useAppForeground() {
  const [isForeground, setIsForeground] = React.useState(AppState.currentState === "active")

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", nextState => {
      setIsForeground(nextState === "active")
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return isForeground
}
