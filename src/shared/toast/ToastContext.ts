import { createContext } from "react"

export type ToastTone = "default" | "success" | "warning" | "error"

export type ToastInput =
  | string
  | {
      message: string
      tone?: ToastTone
      duration?: number
    }

export type ToastContextValue = {
  hideToast: () => void
  showToast: (input: ToastInput) => void
}

export const ToastContext = createContext<ToastContextValue>({
  hideToast: () => undefined,
  showToast: () => undefined,
})
