import { useContext } from "react"

import { ToastContext } from "@/shared/toast/ToastContext"

export function useToast() {
  return useContext(ToastContext)
}
