import QRCode from "qrcode"

import { getCurrentLanguage } from "@/shared/i18n"
import { deepLinkAdapter } from "@/shared/native"

export type GuideSection = "wallet" | "faq" | "knowledge" | "safety"

export type GuideLinkItem = {
  title: string
  url: string
}

const GUIDE_LINKS: Record<GuideSection, Record<"en-US" | "zh-CN", GuideLinkItem[]>> = {
  wallet: {
    "en-US": [
      { title: "Quickstart", url: "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-tutorial/quickstart" },
      { title: "How to send USDT", url: "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-tutorial/how-to-send-usdt" },
      { title: "How to receive USDT", url: "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-tutorial/how-to-receive-usdt" },
      { title: "Use Passkey for wallet backup", url: "https://cpcash-1.gitbook.io/cpcash-wallet/use-passkey-for-wallet-backup" },
    ],
    "zh-CN": [
      { title: "使用 MetaMask 钱包登录", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qian-bao-shi-yong-jiao-cheng/shi-yong-metamask-qian-bao-deng-lu" },
      { title: "如何发送 USDT", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qian-bao-shi-yong-jiao-cheng/ru-he-fa-song-usdt" },
      { title: "如何接收 USDT", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qian-bao-shi-yong-jiao-cheng/ru-he-jie-shou-usdt" },
      { title: "使用 Passkey 备份钱包", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qian-bao-shi-yong-jiao-cheng/shi-yong-passkey-bei-fen-qian-bao" },
    ],
  },
  faq: {
    "en-US": [
      { title: "What is Passkey?", url: "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-faq/quickstart" },
      { title: "What is mnemonic?", url: "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-faq/what-is-mnemonic" },
      { title: "What is a bridge address?", url: "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-faq/what-is-a-bridge-address" },
      { title: "Difference for individuals and business", url: "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-faq/what-is-the-difference-for-individualsand-and-for-business" },
    ],
    "zh-CN": [
      { title: "什么是 Passkey", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qian-bao-chang-jian-wen-ti/shen-me-shi-passkey" },
      { title: "什么是助记词", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qian-bao-chang-jian-wen-ti/shen-me-shi-zhu-ji-ci" },
      { title: "什么是跨链桥地址", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qian-bao-chang-jian-wen-ti/shen-me-shi-kua-lian-qiao-di-zhi" },
      { title: "个人与企业收款有什么区别", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qian-bao-chang-jian-wen-ti/ge-ren-yong-hu-he-qi-ye-yong-hu-you-shen-me-qu-bie" },
    ],
  },
  knowledge: {
    "en-US": [
      { title: "What is blockchain", url: "https://cpcash-1.gitbook.io/cpcash-wallet/blockchain-basic/what-is-blockchain" },
      { title: "What is a decentralized wallet", url: "https://cpcash-1.gitbook.io/cpcash-wallet/blockchain-basic/what-is-a-decentralized-wallet" },
      { title: "What is DeFi", url: "https://cpcash-1.gitbook.io/cpcash-wallet/blockchain-basic/what-is-defi" },
      { title: "What is 2FA", url: "https://cpcash-1.gitbook.io/cpcash-wallet/blockchain-basic/what-is-two-factor-authentication-2fa" },
    ],
    "zh-CN": [
      { title: "什么是区块链", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qu-kuai-lian-ji-chu/qu-kuai-lian-shi-shen-me" },
      { title: "什么是去中心化钱包", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qu-kuai-lian-ji-chu/shen-me-shi-qu-zhong-xin-hua-qian-bao" },
      { title: "什么是 DeFi", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qu-kuai-lian-ji-chu/shen-me-shi-defi" },
      { title: "什么是双重身份验证 2FA", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/qu-kuai-lian-ji-chu/shen-me-shi-shuang-chong-shen-fen-yan-zheng-2fa" },
    ],
  },
  safety: {
    "en-US": [
      { title: "Keep your recovery phrase safe", url: "https://cpcash-1.gitbook.io/cpcash-wallet/safefy-knowledge/keep-your-recovery-phrase-and-private-key-safe" },
      { title: "Theft prevention", url: "https://cpcash-1.gitbook.io/cpcash-wallet/safefy-knowledge/theft-prevention" },
    ],
    "zh-CN": [
      { title: "保护恢复短语和私钥安全", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/an-quan-zhi-shi/bao-chi-nin-de-hui-fu-duan-yu-he-si-yao-an-quan" },
      { title: "盗窃防范", url: "https://cpcash-1.gitbook.io/cpcash-wallet/cn/an-quan-zhi-shi/dao-qie-fang-fan" },
    ],
  },
}

export function getGuideLinks(section: GuideSection) {
  const language = getCurrentLanguage() === "zh-CN" ? "zh-CN" : "en-US"
  return GUIDE_LINKS[section][language]
}

export async function openExternalUrl(url: string) {
  const result = await deepLinkAdapter.open(url)
  if (!result.ok) {
    throw result.error
  }
}

export async function buildInviteQrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    margin: 1,
  })
}
