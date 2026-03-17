import {
  resolvePreferredReceiveChainColor,
  shouldPrimeReceiveChainColorFromRoute,
} from "@/domains/wallet/receive/services/receiveColorCache"

describe("receiveColorCache helpers", () => {
  it("prefers cached color over route color", () => {
    expect(
      resolvePreferredReceiveChainColor({
        cachedColor: "#00AAFF",
        routeColor: "#FF6600",
        fallbackColor: "#111111",
      }),
    ).toBe("#00AAFF")
  })

  it("falls back to route color when no cache exists", () => {
    expect(
      resolvePreferredReceiveChainColor({
        cachedColor: "",
        routeColor: "#FF6600",
        fallbackColor: "#111111",
      }),
    ).toBe("#FF6600")
  })

  it("falls back to default color when cache and route color are missing", () => {
    expect(
      resolvePreferredReceiveChainColor({
        cachedColor: "",
        routeColor: "",
        fallbackColor: "#111111",
      }),
    ).toBe("#111111")
  })

  it("only primes route color when cache is missing", () => {
    expect(
      shouldPrimeReceiveChainColorFromRoute({
        cachedColor: "",
        routeColor: "#FF6600",
      }),
    ).toBe(true)

    expect(
      shouldPrimeReceiveChainColorFromRoute({
        cachedColor: "#00AAFF",
        routeColor: "#FF6600",
      }),
    ).toBe(false)
  })
})
