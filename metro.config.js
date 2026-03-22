const path = require("path")

const { getDefaultConfig } = require("expo/metro-config")
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config")

const ignoredRoots = ["android", "ios", ".git", ".pnpm-store", "docs", "tests", "e2e"].map(segment =>
  new RegExp(`${path.resolve(__dirname, segment).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/.*`),
)
const ignoredRootsBlockList = new RegExp(ignoredRoots.map(pattern => pattern.source).join("|"))

const config = getDefaultConfig(__dirname)
config.resolver.blockList = ignoredRootsBlockList

module.exports = wrapWithReanimatedMetroConfig(config)
