import {
  OrderStatus,
  buildFlowProofRange,
  buildRangeSelection,
  formatAddressLabel,
  formatCompactTimestamp,
  formatMonthKey,
  formatSignedTokenAmount,
  formatTimestamp,
  formatTokenAmount,
  groupOrdersByMonth,
  isIncomingOrderType,
  resolveBillAddressTitle,
  resolveCounterpartyLabel,
  resolveCounterpartyAddress,
  resolveDetailCounterparty,
  resolveOrderBillRangeOptions,
  resolveOrderExplorerUrl,
  resolveOrderListStatusBadge,
  resolveOrderStatusLabel,
  resolveRangeLabel,
  resolveRangeOptions,
  resolveOrderTypeOptions,
  resolveOrderTypeLabel,
  resolveQuickRange,
  resolveVoucherExternalUrl,
  shouldShowBillAction,
  shouldShowConfirm,
  shouldShowHistoryAction,
  shouldShowRefund,
  shouldShowVoucherAction,
  summarizeStatistics,
  toApiDateTime,
} from "@/features/orders/utils/orderHelpers"

const t = (key: string) => key

describe("orderHelpers", () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it("detects incoming order types case-insensitively", () => {
    expect(isIncomingOrderType("receipt")).toBe(true)
    expect(isIncomingOrderType("TRACE_CHILD")).toBe(true)
    expect(isIncomingOrderType("payment")).toBe(false)
  })

  it("maps order type labels to translation keys", () => {
    expect(resolveOrderTypeLabel(t, "send_token_receive")).toBe("orders.types.sendToken")
    expect(resolveOrderTypeLabel(t, "SEND")).toBe("orders.types.sendCode")
    expect(resolveOrderTypeLabel(t, "NATIVE")).toBe("orders.types.native")
    expect(resolveOrderTypeLabel(t, "payment_normal")).toBe("orders.types.payment")
    expect(resolveOrderTypeLabel(t, "receipt_fixed")).toBe("orders.types.receipt")
    expect(resolveOrderTypeLabel(t, "")).toBe("orders.types.unknown")
  })

  it("exposes only the supported order type filter chips", () => {
    expect(resolveOrderTypeOptions(t)).toEqual([
      { label: "orders.filters.all", value: undefined },
      { label: "orders.types.receipt", value: "RECEIPT" },
      { label: "orders.types.payment", value: "PAYMENT" },
    ])
  })

  it("resolves the counterparty address for incoming orders", () => {
    const order = {
      orderType: "RECEIPT",
      paymentAddress: "payment-address",
      transferAddress: "transfer-address",
      depositAddress: "deposit-address",
      receiveAddress: "receive-address",
    }

    expect(resolveCounterpartyAddress(order)).toBe("payment-address")
    expect(resolveDetailCounterparty(order)).toBe("payment-address")
  })

  it("falls back through transfer, deposit and receive addresses for incoming orders", () => {
    expect(
      resolveCounterpartyAddress({
        orderType: "RECEIPT",
        paymentAddress: "",
        transferAddress: "",
        depositAddress: "deposit-address",
        receiveAddress: "receive-address",
      }),
    ).toBe("deposit-address")

    expect(
      resolveDetailCounterparty({
        orderType: "RECEIPT",
        paymentAddress: "",
        transferAddress: "",
        depositAddress: "",
        receiveAddress: "receive-address",
      }),
    ).toBe("receive-address")
  })

  it("resolves the counterparty address for outgoing orders", () => {
    const order = {
      orderType: "SEND",
      paymentAddress: "payment-address",
      transferAddress: "transfer-address",
      depositAddress: "deposit-address",
      receiveAddress: "receive-address",
    }

    expect(resolveCounterpartyAddress(order)).toBe("receive-address")
    expect(resolveDetailCounterparty(order)).toBe("receive-address")
  })

  it("falls back to the payment address for outgoing orders when no other address exists", () => {
    expect(
      resolveCounterpartyAddress({
        orderType: "SEND",
        paymentAddress: "payment-address",
        transferAddress: "",
        depositAddress: "",
        receiveAddress: "",
      }),
    ).toBe("payment-address")
  })

  it("builds quick ranges from the current local day", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 2, 15, 10, 20, 30, 456))

    const range = resolveQuickRange("today")

    expect(range).not.toBeNull()
    expect(range?.startedTimestamp).toBe(new Date(2026, 2, 15, 0, 0, 0, 0).getTime())
    expect(range?.endedTimestamp).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).getTime())
    expect(range?.startedAt).toBe("2026-03-15 00:00:00")
    expect(range?.endedAt).toBe("2026-03-15 23:59:59")
  })

  it("builds yesterday and trailing-day ranges", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 2, 15, 10, 20, 30, 456))

    expect(resolveQuickRange("yesterday")).toMatchObject({
      startedAt: "2026-03-14 00:00:00",
      endedAt: "2026-03-14 23:59:59",
    })
    expect(resolveQuickRange("last7d")).toMatchObject({
      startedAt: "2026-03-09 00:00:00",
      endedAt: "2026-03-15 23:59:59",
    })
    expect(resolveQuickRange("last30d")).toMatchObject({
      startedAt: "2026-02-14 00:00:00",
      endedAt: "2026-03-15 23:59:59",
    })
  })

  it("keeps all-range selections empty", () => {
    expect(buildRangeSelection("all")).toEqual({
      preset: "all",
      startedAt: undefined,
      endedAt: undefined,
      startedTimestamp: undefined,
      endedTimestamp: undefined,
    })
  })

  it("builds flow proof ranges from the order creation date", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 2, 15, 10, 20, 30, 456))

    const range = buildFlowProofRange({ createdAt: new Date(2026, 1, 10, 18, 45, 0, 0).getTime() }, "sinceCreated")

    expect(range.startedTimestamp).toBe(new Date(2026, 1, 10, 0, 0, 0, 0).getTime())
    expect(range.endedTimestamp).toBe(new Date(2026, 2, 15, 23, 59, 59, 999).getTime())
    expect(range.startedAt).toBe("2026-02-10 00:00:00")
    expect(range.endedAt).toBe("2026-03-15 23:59:59")
  })

  it("shows voucher actions only for supported outgoing statuses", () => {
    expect(shouldShowVoucherAction("SEND", OrderStatus.BuyerPaid)).toBe(true)
    expect(shouldShowVoucherAction("SEND", OrderStatus.TimeoutClosed)).toBe(false)
    expect(shouldShowVoucherAction("RECEIPT", OrderStatus.BuyerPaid)).toBe(false)
  })

  it("maps order status labels", () => {
    expect(resolveOrderStatusLabel(t, OrderStatus.OrderFinished)).toBe("orders.status.finished")
    expect(resolveOrderStatusLabel(t, OrderStatus.BuyerConfirming)).toBe("orders.status.confirming")
    expect(resolveOrderStatusLabel(t, OrderStatus.SellerPaying)).toBe("orders.status.processing")
    expect(resolveOrderStatusLabel(t, OrderStatus.BuyerPaid)).toBe("orders.status.buyerPaid")
    expect(resolveOrderStatusLabel(t, OrderStatus.BuyerPaymentBroadcasting)).toBe("orders.status.broadcasting")
    expect(resolveOrderStatusLabel(t, OrderStatus.BuyerPaying)).toBe("orders.status.pending")
    expect(resolveOrderStatusLabel(t, OrderStatus.Refunded)).toBe("orders.status.refunded")
    expect(resolveOrderStatusLabel(t, OrderStatus.TimeoutClosed)).toBe("orders.status.closed")
  })

  it("hides completed statuses from list badges", () => {
    expect(resolveOrderListStatusBadge(t, OrderStatus.OrderFinished)).toBeNull()
  })

  it("maps list badges to active and failure tones", () => {
    expect(resolveOrderListStatusBadge(t, OrderStatus.BuyerPaying)).toEqual({
      label: "orders.status.pending",
      tone: "warning",
    })
    expect(resolveOrderListStatusBadge(t, OrderStatus.BuyerPaid)).toEqual({
      label: "orders.status.inProgress",
      tone: "info",
    })
    expect(resolveOrderListStatusBadge(t, OrderStatus.SellerPaying)).toEqual({
      label: "orders.status.inProgress",
      tone: "info",
    })
    expect(resolveOrderListStatusBadge(t, OrderStatus.TimeoutClosed)).toEqual({
      label: "orders.status.failed",
      tone: "danger",
    })
    expect(resolveOrderListStatusBadge(t, OrderStatus.Refunded)).toEqual({
      label: "orders.status.refunded",
      tone: "danger",
    })
    expect(resolveOrderListStatusBadge(t, 999)).toEqual({
      label: "orders.status.closed",
      tone: "info",
    })
  })

  it("picks the correct explorer URL source for each order direction", () => {
    expect(
      resolveOrderExplorerUrl({
        orderType: "RECEIPT",
        sendChainBrowsers: [{ addressUrl: "", logo: "", txIdUrl: "https://send.example/tx", url: "" }],
        recvChainBrowsers: [{ addressUrl: "", logo: "", txIdUrl: "https://recv.example/tx", url: "" }],
      }),
    ).toBe("https://send.example/tx")

    expect(
      resolveOrderExplorerUrl({
        orderType: "SEND",
        sendChainBrowsers: [{ addressUrl: "", logo: "", txIdUrl: "https://send.example/tx", url: "" }],
        recvChainBrowsers: [{ addressUrl: "https://recv.example/address", logo: "", txIdUrl: "", url: "" }],
      }),
    ).toBe("https://recv.example/address")

    expect(
      resolveOrderExplorerUrl({
        orderType: "SEND",
        sendChainBrowsers: [{ addressUrl: "", logo: "", txIdUrl: "", url: "" }],
        recvChainBrowsers: [{ addressUrl: "", logo: "", txIdUrl: "", url: "" }],
      }),
    ).toBe("")
  })

  it("formats token amounts, timestamps and month keys", () => {
    expect(formatSignedTokenAmount("RECEIPT", 12.3456)).toBe("+12.3456")
    expect(formatSignedTokenAmount("SEND", 12.3456, 2)).toBe("-12.35")
    expect(formatTokenAmount(Number.NaN)).toBe("0")
    expect(formatTimestamp(null)).toBe("--")
    expect(formatCompactTimestamp(null)).toBe("--")
    expect(formatTimestamp(new Date(2026, 2, 15, 10, 20).getTime(), { hour12: false })).toContain("2026")
    expect(formatCompactTimestamp(new Date(2026, 2, 15, 10, 20).getTime())).toBe("03-15 10:20")
    expect(formatMonthKey(null)).toBe("Unknown")
    expect(toApiDateTime(new Date(2026, 2, 15, 10, 20, 30))).toBe("2026-03-15 10:20:30")
    expect(formatMonthKey(new Date(2026, 2, 15, 10, 20, 30).getTime())).toBe("2026-03")
  })

  it("returns placeholders when compact timestamp coercion throws", () => {
    const throwingValue = {
      [Symbol.toPrimitive]() {
        throw new Error("bad date")
      },
    }

    expect(formatCompactTimestamp(throwingValue as unknown as number)).toBe("--")
  })

  it("falls back when timestamp formatting throws", () => {
    const dateTimeFormat = jest.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("unsupported")
    })

    expect(formatTimestamp(Date.now())).toBe("--")

    dateTimeFormat.mockRestore()
  })

  it("groups orders by month and resolves filter labels", () => {
    expect(
      groupOrdersByMonth([
        { orderSn: "1", createdAt: new Date(2026, 2, 15).getTime() },
        { orderSn: "2", createdAt: new Date(2026, 2, 10).getTime() },
        { orderSn: "3", createdAt: new Date(2026, 1, 12).getTime() },
      ] as never),
    ).toEqual([
      [
        "2026-03",
        [
          { orderSn: "1", createdAt: new Date(2026, 2, 15).getTime() },
          { orderSn: "2", createdAt: new Date(2026, 2, 10).getTime() },
        ],
      ],
      [
        "2026-02",
        [{ orderSn: "3", createdAt: new Date(2026, 1, 12).getTime() }],
      ],
    ])

    expect(resolveRangeLabel(t, "today")).toBe("orders.filters.today")
    expect(resolveRangeLabel(t, "yesterday")).toBe("orders.filters.yesterday")
    expect(resolveRangeLabel(t, "last7d")).toBe("orders.filters.last7d")
    expect(resolveRangeLabel(t, "last30d")).toBe("orders.filters.last30d")
    expect(resolveRangeLabel(t, "all")).toBe("orders.filters.all")
    expect(resolveRangeOptions(t)).toEqual([
      { label: "orders.filters.all", value: "all" },
      { label: "orders.filters.today", value: "today" },
      { label: "orders.filters.yesterday", value: "yesterday" },
      { label: "orders.filters.last7d", value: "last7d" },
      { label: "orders.filters.last30d", value: "last30d" },
    ])
    expect(resolveOrderBillRangeOptions(t)).toEqual([
      { label: "orders.filters.today", value: "today" },
      { label: "orders.filters.yesterday", value: "yesterday" },
      { label: "orders.filters.last7d", value: "last7d" },
      { label: "orders.filters.last30d", value: "last30d" },
    ])
  })

  it("resolves address labels, vouchers, statistics and action guards", () => {
    expect(resolveCounterpartyLabel(t, "RECEIPT")).toBe("orders.detail.from")
    expect(resolveCounterpartyLabel(t, "SEND")).toBe("orders.detail.to")
    expect(shouldShowConfirm({ status: OrderStatus.BuyerConfirming, statusName: "" })).toBe(true)
    expect(shouldShowConfirm({ status: OrderStatus.OrderFinished, statusName: "" })).toBe(false)
    expect(shouldShowRefund({ status: OrderStatus.Refunded, buyerRefundAddress: "T123" })).toBe(true)
    expect(shouldShowRefund({ status: OrderStatus.OrderFinished, buyerRefundAddress: "" })).toBe(false)
    expect(shouldShowHistoryAction(OrderStatus.TimeoutClosed)).toBe(true)
    expect(shouldShowHistoryAction(OrderStatus.BuyerPaying)).toBe(false)
    expect(shouldShowBillAction(OrderStatus.BuyerConfirming)).toBe(true)
    expect(shouldShowBillAction(OrderStatus.BuyerPaid)).toBe(false)
    expect(resolveVoucherExternalUrl({ orderReceiptUrl: "", txBrowserUrl: "https://browser/tx" })).toBe("https://browser/tx")
    expect(resolveVoucherExternalUrl({ orderReceiptUrl: "https://receipt", txBrowserUrl: "https://browser/tx" })).toBe(
      "https://receipt",
    )
    expect(
      summarizeStatistics({
        paymentAmount: 12.345,
        receiptAmount: 6.789,
        fee: 0.12,
        transactions: 3,
      }),
    ).toEqual([
      { key: "payment", value: "12.35" },
      { key: "receipt", value: "6.79" },
      { key: "fee", value: "0.12" },
      { key: "transactions", value: "3" },
    ])
    expect(formatAddressLabel("", "N/A")).toBe("N/A")
    expect(formatAddressLabel("T1234567890123456789012345678901234")).toBe("T1234567...901234")
    expect(resolveBillAddressTitle({ address: "T1234567890123456789012345678901234" } as never)).toBe("T1234567...901234")
  })

  it("falls back across counterparty addresses and explorer urls", () => {
    expect(
      resolveCounterpartyAddress({
        orderType: "RECEIPT",
        paymentAddress: "",
        transferAddress: "transfer-address",
        depositAddress: "deposit-address",
        receiveAddress: "receive-address",
      }),
    ).toBe("transfer-address")
    expect(
      resolveCounterpartyAddress({
        orderType: "SEND",
        paymentAddress: "payment-address",
        transferAddress: "",
        depositAddress: "deposit-address",
        receiveAddress: "",
      }),
    ).toBe("deposit-address")
    expect(
      resolveOrderExplorerUrl({
        orderType: "SEND",
        sendChainBrowsers: [],
        recvChainBrowsers: [],
      }),
    ).toBe("")
  })

  it("builds invalid quick ranges as null and supports trailing flow-proof ranges", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 2, 15, 10, 20, 30, 456))

    expect(resolveQuickRange("invalid" as never)).toBeNull()
    expect(buildFlowProofRange({ createdAt: null }, "last30d")).toMatchObject({
      startedAt: "2026-02-14 00:00:00",
      endedAt: "2026-03-15 23:59:59",
    })
    expect(buildFlowProofRange({ createdAt: null }, "last7d")).toMatchObject({
      startedAt: "2026-03-09 00:00:00",
      endedAt: "2026-03-15 23:59:59",
    })
  })
})
