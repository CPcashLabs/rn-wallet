import {
  buildReceiveAutoCreateKey,
  shouldAttemptReceiveAutoCreate,
} from "@/plugins/receive/screens/receiveAutoCreate"

describe("receiveAutoCreate", () => {
  it("builds a stable key for the same auto-create context", () => {
    expect(
      buildReceiveAutoCreateKey({
        receiveAddress: " 0xABC ",
        multisigWalletId: "wallet-1",
        sellerId: 12,
        sendCoinCode: "USDT",
        recvCoinCode: "TRX",
      }),
    ).toBe(
      buildReceiveAutoCreateKey({
        receiveAddress: "0xabc",
        multisigWalletId: "wallet-1",
        sellerId: "12",
        sendCoinCode: "USDT",
        recvCoinCode: "TRX",
      }),
    )
  })

  it("allows a new attempt only when the auto-create context changes", () => {
    const currentKey = buildReceiveAutoCreateKey({
      receiveAddress: "0xabc",
      multisigWalletId: "wallet-1",
      sellerId: 12,
      sendCoinCode: "USDT",
      recvCoinCode: "TRX",
    })

    expect(
      shouldAttemptReceiveAutoCreate({
        attemptedKey: null,
        currentKey,
        hasPersonalOrder: false,
      }),
    ).toBe(true)

    expect(
      shouldAttemptReceiveAutoCreate({
        attemptedKey: currentKey,
        currentKey,
        hasPersonalOrder: false,
      }),
    ).toBe(false)

    expect(
      shouldAttemptReceiveAutoCreate({
        attemptedKey: currentKey,
        currentKey: `${currentKey}:next`,
        hasPersonalOrder: false,
      }),
    ).toBe(true)
  })

  it("skips auto-create when a personal order already exists", () => {
    const currentKey = buildReceiveAutoCreateKey({
      receiveAddress: "0xabc",
      sellerId: 12,
      sendCoinCode: "USDT",
      recvCoinCode: "TRX",
    })

    expect(
      shouldAttemptReceiveAutoCreate({
        attemptedKey: null,
        currentKey,
        hasPersonalOrder: true,
      }),
    ).toBe(false)
  })
})
