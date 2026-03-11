import { useContext } from "react"

import { ThemeContext } from "@/shared/theme/ThemeContext"

export function useAppTheme() {
  return useContext(ThemeContext)
}
