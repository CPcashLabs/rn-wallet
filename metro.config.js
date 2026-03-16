const path = require("path")

const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config")
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config")

const ignoredRoots = ["android", "ios", ".git", ".pnpm-store", "docs", "tests", "e2e"].map(segment =>
  new RegExp(`${path.resolve(__dirname, segment).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/.*`),
)
const ignoredRootsBlockList = new RegExp(ignoredRoots.map(pattern => pattern.source).join("|"))

const defaultConfig = getDefaultConfig(__dirname)

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(defaultConfig, {
    projectRoot: __dirname,
    resolver: {
      blockList: ignoredRootsBlockList,
    },
  }),
)
