import React, { useEffect } from "react"

import { act, create } from "react-test-renderer"

import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"

const mockShowToast = jest.fn()
const mockLogErrorSafely = jest.fn()
const mockResolveErrorMessage = jest.fn()

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock("@/shared/toast/useToast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}))

jest.mock("@/shared/logging/safeConsole", () => ({
  logErrorSafely: (...args: unknown[]) => mockLogErrorSafely(...args),
}))

jest.mock("@/shared/errors/presentation", () => ({
  resolveErrorMessage: (...args: unknown[]) => mockResolveErrorMessage(...args),
}))

function Harness() {
  const { presentError } = useErrorPresenter()

  useEffect(() => {
    presentError(new Error("boom"), {
      fallbackKey: "common.errors.networkUnavailable",
      mode: "toast",
    })
  }, [presentError])

  return null
}

describe("useErrorPresenter", () => {
  beforeEach(() => {
    mockShowToast.mockReset()
    mockLogErrorSafely.mockReset()
    mockResolveErrorMessage.mockReset()
    mockResolveErrorMessage.mockReturnValue("网络不可用，请稍后重试。")
  })

  it("uses friendly toast copy while keeping handled errors out of console overlays by default", async () => {
    await act(async () => {
      create(<Harness />)
    })

    expect(mockShowToast).toHaveBeenCalledWith({
      message: "网络不可用，请稍后重试。",
      tone: "error",
    })
    expect(mockLogErrorSafely).toHaveBeenCalledWith(
      "[error]",
      expect.any(Error),
      expect.objectContaining({
        context: {
          resolvedMessage: "网络不可用，请稍后重试。",
        },
        forwardToConsole: false,
      }),
    )
  })
})
