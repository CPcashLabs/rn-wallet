import React, { useEffect } from "react"

import TestRenderer, { act } from "react-test-renderer"

import { ToastProvider, mapToastToneToType, normalizeToast } from "@/shared/toast/ToastProvider"
import { useToast } from "@/shared/toast/useToast"

const mockToastRender = jest.fn((props?: unknown) => props)
const mockShow = jest.fn()
const mockHide = jest.fn()

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    bottom: 20,
    left: 0,
    right: 0,
    top: 0,
  }),
}))

jest.mock("react-native-toast-message", () => {
  const React = require("react")
  const Toast = Object.assign(
    jest.fn((props: unknown) => {
      mockToastRender(props)
      return React.createElement(React.Fragment)
    }),
    {
      hide: (...args: unknown[]) => mockHide(...args),
      show: (...args: unknown[]) => mockShow(...args),
    },
  )

  return {
    __esModule: true,
    default: Toast,
  }
})

jest.mock("@/shared/theme/useAppTheme", () => ({
  useAppTheme: () => ({
    colors: {
      dangerEmphasis: "#991B1B",
      dangerBorder: "#FECACA",
      success: "#0F766E",
      successBorder: "#14B8A6",
      toastDefaultBackground: "#111827",
      toastDefaultBorder: "#334155",
      warningBorder: "#F59E0B",
      warningEmphasis: "#92400E",
    },
    isDark: false,
  }),
}))

function ToastProbe({ message }: { message: string }) {
  const { hideToast, showToast } = useToast()

  useEffect(() => {
    showToast({
      duration: 1500,
      message,
      tone: "success",
    })
    hideToast()
  }, [hideToast, message, showToast])

  return null
}

describe("ToastProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("normalizes string and object toast inputs", () => {
    expect(normalizeToast("Saved")).toEqual({
      duration: 2200,
      message: "Saved",
      tone: "default",
    })
    expect(
      normalizeToast({
        duration: 1200,
        message: "Updated",
        tone: "warning",
      }),
    ).toEqual({
      duration: 1200,
      message: "Updated",
      tone: "warning",
    })
    expect(mapToastToneToType("error")).toBe("error")
    expect(mapToastToneToType("default")).toBe("default")
  })

  it("delegates toast presentation to react-native-toast-message", () => {
    act(() => {
      TestRenderer.create(
        <ToastProvider>
          <ToastProbe message="Avatar updated" />
        </ToastProvider>,
      )
    })

    expect(mockToastRender).toHaveBeenCalledWith(
      expect.objectContaining({
        autoHide: true,
        bottomOffset: 28,
        position: "bottom",
        swipeable: true,
        visibilityTime: 2200,
      }),
    )
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        bottomOffset: 28,
        position: "bottom",
        text1: "Avatar updated",
        type: "success",
        visibilityTime: 1500,
      }),
    )
    expect(mockHide).toHaveBeenCalled()
  })
})
