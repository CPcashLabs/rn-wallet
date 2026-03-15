const mockApiGet = jest.fn()
const mockApiPut = jest.fn()
const mockApiDelete = jest.fn()
const mockApiPost = jest.fn()
const mockBuildImageUploadFormDataPart = jest.fn()

jest.mock("@/shared/api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}))

jest.mock("@/shared/api/uploadFile", () => ({
  buildImageUploadFormDataPart: (...args: unknown[]) => mockBuildImageUploadFormDataPart(...args),
}))

import {
  bindCategoryLabel,
  confirmOrder,
  createCategoryLabel,
  deleteCategoryLabel,
  deleteOrder,
  exportOrderBill,
  findOrderLabels,
  getBillDetail,
  getOrderBillAddresses,
  getOrderBillStatistics,
  getOrderDetail,
  getOrderTxlogStatistics,
  getOrderTxlogs,
  getRefundDetail,
  getTransferVoucher,
  listUserCategoryLabels,
  sendDigitalReceiptEmail,
  sendFlowProofEmail,
  uploadOrderNoteImage,
} from "@/features/orders/services/ordersApi"

class MockFormData {
  parts: Array<[string, unknown]> = []

  append(name: string, value: unknown) {
    this.parts.push([name, value])
  }
}

describe("ordersApi", () => {
  const runtimeGlobals = globalThis as typeof globalThis & {
    FormData?: typeof FormData
  }
  const originalFormData = runtimeGlobals.FormData

  beforeAll(() => {
    runtimeGlobals.FormData = MockFormData as unknown as typeof FormData
  })

  afterAll(() => {
    runtimeGlobals.FormData = originalFormData
  })

  beforeEach(() => {
    mockApiGet.mockReset()
    mockApiPut.mockReset()
    mockApiDelete.mockReset()
    mockApiPost.mockReset()
    mockBuildImageUploadFormDataPart.mockReset()
  })

  it("loads tx logs with mapped payloads and a serializer that omits empty params", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            wallet_address: "T_WALLET",
            created_at: "1700000000000",
            deposit_address: "T_DEPOSIT",
            order_sn: "ORDER_1",
            order_type: "PAYMENT",
            payment_address: "T_PAYMENT",
            receive_address: "T_RECEIVE",
            recv_actual_amount: "9.5",
            recv_amount: "10.5",
            recv_coin_name: "USDT",
            recv_estimate_amount: "10.1",
            refund_address: "T_REFUND",
            send_actual_amount: "11.5",
            send_amount: "12.5",
            send_coin_name: "BTT",
            send_estimate_amount: "12.1",
            status: "3",
            transfer_address: null,
            avatar: "https://example.com/avatar.png",
            labels: ["Travel", 42],
          },
        ],
        total: "8",
        page: "2",
        other_address: "T_OTHER",
      },
    })

    const result = await getOrderTxlogs({
      page: 2,
      perPage: 50,
      orderType: "PAYMENT",
      otherAddress: "T_OTHER",
      startedAt: "2026-03-01 00:00:00",
      endedAt: "2026-03-15 23:59:59",
    })

    expect(result).toEqual({
      data: [
        {
          walletAddress: "T_WALLET",
          createdAt: 1700000000000,
          depositAddress: "T_DEPOSIT",
          orderSn: "ORDER_1",
          orderType: "PAYMENT",
          paymentAddress: "T_PAYMENT",
          receiveAddress: "T_RECEIVE",
          recvActualAmount: 9.5,
          recvAmount: 10.5,
          recvCoinName: "USDT",
          recvEstimateAmount: 10.1,
          refundAddress: "T_REFUND",
          sendActualAmount: 11.5,
          sendAmount: 12.5,
          sendCoinName: "BTT",
          sendEstimateAmount: 12.1,
          status: 3,
          transferAddress: "",
          avatar: "https://example.com/avatar.png",
          labels: ["Travel", "42"],
        },
      ],
      total: 8,
      page: 2,
      otherAddress: "T_OTHER",
    })

    const config = mockApiGet.mock.calls[0]?.[1]
    expect(config.paramsSerializer({
      page: 2,
      tags: ["one", "", "two"],
      empty: "",
      nil: null,
      order_type: "PAYMENT",
    })).toBe("page=2&tags=one&tags=two&order_type=PAYMENT")
  })

  it("falls back for sparse tx-log pages and item labels", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          data: null,
          total: "0",
          page: "0",
          other_address: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              order_sn: "ORDER_2",
              labels: null,
            },
          ],
          total: "1",
          page: "0",
        },
      })

    await expect(getOrderTxlogs({})).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      otherAddress: "",
    })
    await expect(getOrderTxlogs({ page: 7 })).resolves.toEqual({
      data: [
        expect.objectContaining({
          orderSn: "ORDER_2",
          labels: [],
        }),
      ],
      total: 1,
      page: 7,
      otherAddress: "",
    })

    expect(mockApiGet.mock.calls[0]?.[0]).toBe("/api/order/member/order/cp-cash-page")
    expect(mockApiGet.mock.calls[0]?.[1]).toMatchObject({
      params: {
        page: 1,
        per_page: 20,
      },
    })
  })

  it("loads tx-log statistics and order detail data", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          data: {
            receipt_amount: "20",
            payment_amount: "11.5",
            fee: "0.3",
            transactions: "4",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            note: "memo",
            recv_chain_name: "TRON",
            recv_chain_logo: "recv-chain.png",
            recv_coin_code: "USDT",
            recv_chain_browsers: [{ address_url: "https://recv/address", tx_id_url: "", url: "", logo: "recv.png" }],
            send_chain_browsers: [{ address_url: "", tx_id_url: "https://send/tx", url: "", logo: "send.png" }],
            recv_coin_contract: "0xrecv",
            recv_coin_logo: "recv.png",
            recv_coin_name: "USDT",
            buyer_email: "buyer@example.com",
            buyer_estimate_receive_at: "1700000001000",
            recv_actual_amount: "9.9",
            recv_actual_received_at: "1700000002000",
            receive_address: "T_RECEIVE",
            buyer_refund_address: "T_REFUND",
            payment_address: "T_PAYMENT",
            recv_amount: "10",
            created_at: "1700000003000",
            recv_estimate_amount: "10.2",
            send_estimate_amount: "11.4",
            expired_at: "1700000004000",
            finished_at: "1700000005000",
            order_sn: "ORDER_1",
            order_type: "PAYMENT",
            seller_chain_browsers: [{ address_url: "", tx_id_url: "", url: "https://seller/browser", logo: "seller.png" }],
            send_chain_name: "BTT",
            send_coin_code: "BTT",
            send_coin_contract: "0xsend",
            send_coin_logo: "send.png",
            send_coin_name: "BitTorrent",
            send_coin_precision: "18",
            seller_estimate_receive_at: "1700000006000",
            send_actual_amount: "11.5",
            send_actual_received_at: "1700000007000",
            deposit_address: "T_DEPOSIT",
            transfer_address: "T_TRANSFER",
            send_amount: "12.5",
            status: "4",
            status_name: "Finished",
            send_actual_fee_amount: "0.1",
            send_estimate_fee_amount: "0.2",
            send_fee_amount: "0.3",
            multisig_wallet_id: 99,
            multisig_wallet_name: "Team Wallet",
            multisig_wallet_address: "T_MULTI",
            is_buyer: true,
            notes_image_url: "https://example.com/note.png",
            txid: "0xtx",
          },
        },
      })

    await expect(
      getOrderTxlogStatistics({
        orderType: "PAYMENT",
        otherAddress: "T_OTHER",
      }),
    ).resolves.toEqual({
      receiptAmount: 20,
      paymentAmount: 11.5,
      fee: 0.3,
      transactions: 4,
    })

    const statisticsConfig = mockApiGet.mock.calls[0]?.[1]
    expect(statisticsConfig.paramsSerializer({
      order_type: "PAYMENT",
      started_at: "2026-03-01 00:00:00",
      ended_at: "",
      tags: ["one", "", "two"],
      nil: null,
    })).toBe("order_type=PAYMENT&started_at=2026-03-01+00%3A00%3A00&tags=one&tags=two")

    await expect(getOrderDetail("ORDER_1")).resolves.toEqual({
      note: "memo",
      recvChainName: "TRON",
      recvChainLogo: "recv-chain.png",
      recvCoinCode: "USDT",
      recvChainBrowsers: [{ addressUrl: "https://recv/address", txIdUrl: "", url: "", logo: "recv.png" }],
      sendChainBrowsers: [{ addressUrl: "", txIdUrl: "https://send/tx", url: "", logo: "send.png" }],
      recvCoinContract: "0xrecv",
      recvCoinLogo: "recv.png",
      recvCoinName: "USDT",
      buyerEmail: "buyer@example.com",
      buyerEstimateReceiveAt: 1700000001000,
      recvActualAmount: 9.9,
      recvActualReceivedAt: 1700000002000,
      receiveAddress: "T_RECEIVE",
      buyerRefundAddress: "T_REFUND",
      paymentAddress: "T_PAYMENT",
      recvAmount: 10,
      createdAt: 1700000003000,
      recvEstimateAmount: 10.2,
      sendEstimateAmount: 11.4,
      expiredAt: 1700000004000,
      finishedAt: 1700000005000,
      orderSn: "ORDER_1",
      orderType: "PAYMENT",
      sellerChainBrowsers: [{ addressUrl: "", txIdUrl: "", url: "https://seller/browser", logo: "seller.png" }],
      sendChainName: "BTT",
      sendCoinCode: "BTT",
      sendCoinContract: "0xsend",
      sendCoinLogo: "send.png",
      sendCoinName: "BitTorrent",
      sendCoinPrecision: 18,
      sellerEstimateReceiveAt: 1700000006000,
      sendActualAmount: 11.5,
      sendActualReceivedAt: 1700000007000,
      depositAddress: "T_DEPOSIT",
      transferAddress: "T_TRANSFER",
      sendAmount: 12.5,
      status: 4,
      statusName: "Finished",
      sendActualFeeAmount: 0.1,
      sendEstimateFeeAmount: 0.2,
      sendFeeAmount: 0.3,
      multisigWalletId: "99",
      multisigWalletName: "Team Wallet",
      multisigWalletAddress: "T_MULTI",
      isBuyer: true,
      notesImageUrl: "https://example.com/note.png",
      txid: "0xtx",
    })
  })

  it("throws when an order detail payload is missing", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: null,
      },
    })

    await expect(getOrderDetail("ORDER_404")).rejects.toThrow("Order detail not found")
  })

  it("falls back for sparse statistics, detail and bill payloads", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          data: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            recv_chain_browsers: null,
            send_chain_browsers: null,
            seller_chain_browsers: null,
            multisig_wallet_id: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            send_fee_amount: "0.9",
          },
        },
      })

    await expect(getOrderTxlogStatistics({})).resolves.toEqual({
      receiptAmount: 0,
      paymentAmount: 0,
      fee: 0,
      transactions: 0,
    })
    await expect(getOrderDetail("ORDER_SPARSE")).resolves.toEqual(
      expect.objectContaining({
        recvChainBrowsers: [],
        sendChainBrowsers: [],
        sellerChainBrowsers: [],
        multisigWalletId: null,
      }),
    )
    await expect(getBillDetail({ orderSn: "ORDER_SPARSE", address: "T_RECEIVE" })).resolves.toEqual(
      expect.objectContaining({
        feeAmount: 0.9,
      }),
    )

    expect(mockApiGet.mock.calls[0]?.[0]).toBe("/api/order/member/order/cp-cash-statistics")
  })

  it("wraps boolean mutation endpoints", async () => {
    mockApiPut
      .mockResolvedValueOnce({ data: { data: 1 } })
      .mockResolvedValueOnce({ data: { data: 0 } })
      .mockResolvedValueOnce({ data: { data: true } })
    mockApiDelete.mockResolvedValueOnce({ data: { data: true } })

    await expect(confirmOrder("ORDER_1")).resolves.toBe(true)
    await expect(deleteOrder("ORDER_1")).resolves.toBe(true)
    await expect(sendDigitalReceiptEmail({ orderSn: "ORDER_1", email: "user@example.com" })).resolves.toBe(false)
    await expect(
      sendFlowProofEmail({
        email: "user@example.com",
        address: "T_RECEIVE",
        startedAt: "2026-03-01 00:00:00",
        endedAt: "2026-03-15 23:59:59",
      }),
    ).resolves.toBe(true)

    expect(mockApiPut).toHaveBeenNthCalledWith(1, "/api/order/member/order/confirm/ORDER_1", {})
    expect(mockApiDelete).toHaveBeenCalledWith("/api/order/member/order/ORDER_1")
  })

  it("loads voucher, refund and bill data plus bill exports", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          data: {
            order_sn: "ORDER_1",
            order_type: "SEND",
            order_receipt_url: "https://example.com/receipt",
            exchange_type: "2",
            created_at: "1700000000000",
            expired_at: "1700000001000",
            recv_address: "T_RECV",
            recv_chain_name: "TRON",
            recv_coin_code: "USDT",
            recv_coin_contract: "0xrecv",
            recv_coin_name: "USDT",
            recv_amount: "10.5",
            status: "3",
            tx_browser_url: "https://example.com/tx",
            transfer_address: "T_TRANSFER",
            recv_actual_received_at: "1700000002000",
            payment_address: "T_PAYMENT",
            send_amount: "11.5",
            send_coin_name: "BTT",
            send_fee_amount: "0.2",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            amount: "4.2",
            refund_coin_name: "USDT",
            refund_address: "T_REFUND",
            refund_chain_name: "TRON",
            refund_at: "1700000003000",
            refund_txid_url: "https://example.com/refund",
            refund_txid: "0xrefund",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            order_sn: "ORDER_1",
            order_type: "PAYMENT",
            created_at: "1700000004000",
            payment_address: "T_PAYMENT",
            receive_address: "T_RECEIVE",
            deposit_address: "T_DEPOSIT",
            transfer_address: "T_TRANSFER",
            send_amount: "12.5",
            send_coin_name: "BTT",
            recv_amount: "10.5",
            recv_actual_amount: "10",
            recv_coin_name: "USDT",
            send_actual_fee_amount: "0.6",
            note: "memo",
            status: "3",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              adversary_address: "T_COUNTERPARTY",
              payment_amount: "15.2",
              receipt_amount: "12.1",
              avatar: "https://example.com/avatar.png",
            },
          ],
          total: "1",
          page: "3",
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            receipt_amount: "12.1",
            payment_amount: "15.2",
            fee: "0.3",
            transactions: "2",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: "https://example.com/export.csv",
        },
      })

    await expect(getTransferVoucher("ORDER_1")).resolves.toEqual({
      orderSn: "ORDER_1",
      orderType: "SEND",
      orderReceiptUrl: "https://example.com/receipt",
      exchangeType: 2,
      createdAt: 1700000000000,
      expiredAt: 1700000001000,
      recvAddress: "T_RECV",
      recvChainName: "TRON",
      recvCoinCode: "USDT",
      recvCoinContract: "0xrecv",
      recvCoinName: "USDT",
      recvAmount: 10.5,
      status: 3,
      txBrowserUrl: "https://example.com/tx",
      transferAddress: "T_TRANSFER",
      recvActualReceivedAt: 1700000002000,
      paymentAddress: "T_PAYMENT",
      sendAmount: 11.5,
      sendCoinName: "BTT",
      sendFeeAmount: 0.2,
    })
    await expect(getRefundDetail("ORDER_1")).resolves.toEqual({
      amount: 4.2,
      refundCoinName: "USDT",
      refundAddress: "T_REFUND",
      refundChainName: "TRON",
      refundAt: 1700000003000,
      refundTxidUrl: "https://example.com/refund",
      refundTxid: "0xrefund",
    })
    await expect(getBillDetail({ orderSn: "ORDER_1", address: "T_RECEIVE" })).resolves.toEqual({
      orderSn: "ORDER_1",
      orderType: "PAYMENT",
      createdAt: 1700000004000,
      paymentAddress: "T_PAYMENT",
      receiveAddress: "T_RECEIVE",
      depositAddress: "T_DEPOSIT",
      transferAddress: "T_TRANSFER",
      sendAmount: 12.5,
      sendCoinName: "BTT",
      recvAmount: 10.5,
      recvActualAmount: 10,
      recvCoinName: "USDT",
      feeAmount: 0.6,
      note: "memo",
      status: 3,
    })
    await expect(getOrderBillAddresses({ page: 3 })).resolves.toEqual({
      data: [
        {
          address: "T_COUNTERPARTY",
          paymentAmount: 15.2,
          receiptAmount: 12.1,
          avatar: "https://example.com/avatar.png",
        },
      ],
      total: 1,
      page: 3,
    })
    await expect(getOrderBillStatistics({ startedAt: "2026-03-01 00:00:00", endedAt: "2026-03-15 23:59:59" })).resolves.toEqual({
      receiptAmount: 12.1,
      paymentAmount: 15.2,
      fee: 0.3,
      transactions: 2,
    })
    await expect(
      exportOrderBill({
        startedAt: "2026-03-01 00:00:00",
        endedAt: "2026-03-15 23:59:59",
        email: "user@example.com",
        orderSn: "ORDER_1",
      }),
    ).resolves.toBe("https://example.com/export.csv")
  })

  it("loads, mutates and binds category labels", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              category_label_id: 1,
              label_name: "Travel",
              remark: "business trip",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            notes: "memo",
            notes_image_url: "https://example.com/note.png",
            member_order_label_item_volist: [
              {
                category_label_id: 2,
                label_name: "Family",
              },
            ],
          },
        },
      })
    mockApiPost
      .mockResolvedValueOnce({ data: { data: true } })
      .mockResolvedValueOnce({ data: { data: false } })
    mockApiDelete.mockResolvedValueOnce({ data: { data: true } })

    await expect(listUserCategoryLabels()).resolves.toEqual([
      {
        id: "1",
        name: "Travel",
        remark: "business trip",
      },
    ])
    await expect(createCategoryLabel({ labelName: "Travel" })).resolves.toBe(true)
    await expect(deleteCategoryLabel("2")).resolves.toBe(true)
    await expect(findOrderLabels("ORDER_1")).resolves.toEqual({
      notes: "memo",
      notesImageUrl: "https://example.com/note.png",
      labels: [
        {
          id: "2",
          name: "Family",
          remark: "",
        },
      ],
    })
    await expect(
      bindCategoryLabel({
        orderSn: "ORDER_1",
        categoryLabelIds: ["1", "2"],
        notes: "memo",
        notesImageUrl: "https://example.com/note.png",
      }),
    ).resolves.toBe(false)
  })

  it("falls back for sparse bill-address and label collections", async () => {
    mockApiGet
      .mockResolvedValueOnce({
        data: {
          data: null,
          total: "0",
          page: "0",
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: null,
          total: "0",
          page: "0",
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            notes: null,
            member_order_label_item_volist: null,
          },
        },
      })

    await expect(getOrderBillAddresses({})).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
    })
    await expect(getOrderBillAddresses({ page: 5 })).resolves.toEqual({
      data: [],
      total: 0,
      page: 5,
    })
    await expect(listUserCategoryLabels()).resolves.toEqual([])
    await expect(findOrderLabels("ORDER_EMPTY")).resolves.toEqual({
      notes: "",
      notesImageUrl: "",
      labels: [],
    })
  })

  it("uploads order note images and resolves fallback file urls", async () => {
    mockBuildImageUploadFormDataPart.mockReturnValue({
      uri: "file:///tmp/note.png",
      name: "note.jpg",
      type: "image/png",
    })
    mockApiPost
      .mockResolvedValueOnce({
        data: {
          data: {
            full_url: "https://example.com/full.png",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            file_url: "https://example.com/file.png",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            path: "/uploads/note.png",
          },
        },
      })

    await expect(
      uploadOrderNoteImage({
        uri: "file:///tmp/note.png",
      }),
    ).resolves.toBe("https://example.com/full.png")
    await expect(
      uploadOrderNoteImage({
        uri: "file:///tmp/note.png",
      }),
    ).resolves.toBe("https://example.com/file.png")
    await expect(
      uploadOrderNoteImage({
        uri: "file:///tmp/note.png",
      }),
    ).resolves.toBe("/uploads/note.png")

    const firstFormData = mockApiPost.mock.calls[0]?.[1] as MockFormData
    expect(firstFormData.parts).toEqual([
      [
        "file",
        {
          uri: "file:///tmp/note.png",
          name: "note.jpg",
          type: "image/png",
        },
      ],
    ])
    expect(mockBuildImageUploadFormDataPart).toHaveBeenCalledWith(
      {
        uri: "file:///tmp/note.png",
      },
      "note.jpg",
    )
  })
})
