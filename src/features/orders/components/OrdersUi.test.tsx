import React from "react"

import { create, act, type ReactTestRenderer } from "react-test-renderer"

import { OrderMonthSection } from "@/features/orders/components/OrdersUi"
import { useOrderLogStatisticsQuery } from "@/features/orders/queries/orderQueries"

jest.mock("@/features/orders/queries/orderQueries", () => ({
  useOrderLogStatisticsQuery: jest.fn(),
}))

jest.mock("@/shared/theme/useAppTheme", () => ({
  useAppTheme: () => ({
    colors: {
      text: "#111111",
      mutedText: "#666666",
      success: "#00897b",
      primary: "#2276fc",
      primarySoft: "#eef4ff",
      surface: "#ffffff",
      surfaceElevated: "#ffffff",
      glass: "#ffffff",
      glassBorder: "#dddddd",
      border: "#dddddd",
      shadow: "#000000",
    },
    isDark: false,
  }),
}))

jest.mock("@/shared/ui/AppFlowUi", () => {
  const React = require("react")
  const { View } = require("react-native")

  return {
    SectionCard: ({ children, style }: { children: React.ReactNode; style?: unknown }) => <View style={style}>{children}</View>,
  }
})

jest.mock("@/features/orders/components/OrderCounterpartyAvatar", () => {
  const React = require("react")
  const { View } = require("react-native")

  return {
    OrderCounterpartyAvatar: () => <View />,
  }
})

jest.mock("@/shared/ui/AppList", () => {
  const React = require("react")
  const { View } = require("react-native")

  return {
    AppListRow: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  }
})

jest.mock("@/shared/ui/AppStatusHero", () => {
  const React = require("react")
  const { View } = require("react-native")

  return {
    AppStatusHero: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  }
})

jest.mock("@/shared/ui/AppTextField", () => {
  const React = require("react")
  const { View } = require("react-native")

  return {
    AppTextField: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  }
})

const mockUseOrderLogStatisticsQuery = useOrderLogStatisticsQuery as jest.MockedFunction<typeof useOrderLogStatisticsQuery>

const t = (key: string) => key

function createItem(overrides?: Record<string, unknown>) {
  return {
    walletAddress: "",
    createdAt: new Date(2026, 2, 22, 9, 39).getTime(),
    depositAddress: "",
    orderSn: "ORDER_1",
    orderType: "PAYMENT",
    paymentAddress: "T_PAYMENT",
    receiveAddress: "T_RECEIVE",
    recvActualAmount: 1,
    recvAmount: 1,
    recvCoinName: "USDT",
    recvEstimateAmount: 1,
    refundAddress: "",
    sendActualAmount: 2,
    sendAmount: 2,
    sendCoinName: "USDT",
    sendEstimateAmount: 2,
    status: 4,
    transferAddress: "T_TRANSFER",
    avatar: "",
    labels: [],
    ...overrides,
  }
}

describe("OrdersUi", () => {
  beforeEach(() => {
    mockUseOrderLogStatisticsQuery.mockReset()
  })

  it("renders monthly statistics from the api query instead of deriving them from list items", () => {
    mockUseOrderLogStatisticsQuery.mockReturnValue({
      data: {
        paymentAmount: 1503,
        receiptAmount: 1086.85,
        fee: 0,
        transactions: 2,
      },
    } as never)

    let renderer: ReactTestRenderer
    act(() => {
      renderer = create(
        <OrderMonthSection
          month="2026-03"
          items={[
            createItem(),
            createItem({
              orderSn: "ORDER_2",
              orderType: "RECEIPT",
              recvActualAmount: 3,
              recvAmount: 3,
            }),
          ] as never}
          orderType="PAYMENT"
          otherAddress="T_OTHER"
          t={t}
          onPressItem={() => undefined}
        />,
      )
    })
    const tree = renderer!.toJSON()

    expect(mockUseOrderLogStatisticsQuery).toHaveBeenCalledWith(
      {
        otherAddress: "T_OTHER",
        orderType: "PAYMENT",
        startedAt: "2026-03-01 00:00:00",
        endedAt: "2026-03-31 23:59:59",
        startedTimestamp: new Date(2026, 2, 1, 0, 0, 0, 0).getTime(),
        endedTimestamp: new Date(2026, 2, 31, 23, 59, 59, 999).getTime(),
      },
      {
        enabled: true,
      },
    )

    expect(JSON.stringify(tree)).toContain("1,503")
    expect(JSON.stringify(tree)).toContain("1,086.85")
    act(() => {
      renderer!.unmount()
    })
  })

  it("falls back to placeholders when the month cannot be mapped to an api range", () => {
    mockUseOrderLogStatisticsQuery.mockReturnValue({
      data: undefined,
    } as never)

    let renderer: ReactTestRenderer
    act(() => {
      renderer = create(
        <OrderMonthSection
          month="Unknown"
          items={[createItem()] as never}
          t={t}
          onPressItem={() => undefined}
        />,
      )
    })
    const tree = renderer!.toJSON()

    expect(mockUseOrderLogStatisticsQuery).toHaveBeenCalledWith(
      {
        otherAddress: undefined,
        orderType: undefined,
        startedAt: undefined,
        endedAt: undefined,
        startedTimestamp: undefined,
        endedTimestamp: undefined,
      },
      {
        enabled: false,
      },
    )

    expect(JSON.stringify(tree)).toContain("--")
    act(() => {
      renderer!.unmount()
    })
  })
})

export {}
