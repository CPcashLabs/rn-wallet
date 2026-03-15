export const COPOUCH_WALLET_BG_PALETTE: Record<number, { card: string; page: string }> = {
  1: { card: "#DFF6F4", page: "#F4FBFA" },
  2: { card: "#FFF1D6", page: "#FFFBF2" },
  3: { card: "#E8EEFF", page: "#F6F8FF" },
  4: { card: "#FCE7F3", page: "#FFF5FA" },
}

export const COPOUCH_WALLET_CARD_COLORS = Object.values(COPOUCH_WALLET_BG_PALETTE).map(item => item.card)
