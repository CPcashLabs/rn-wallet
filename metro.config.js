const path = require("path")

const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config")
const exclusionList = require("metro-config/src/defaults/exclusionList")

const ignoredRoots = ["android", "ios", ".git", ".pnpm-store", "docs", "tests", "e2e"].map(segment =>
  new RegExp(`${path.resolve(__dirname, segment).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/.*`),
)

const defaultConfig = getDefaultConfig(__dirname)

module.exports = mergeConfig(defaultConfig, {
  projectRoot: __dirname,
  resolver: {
    blockList: exclusionList(ignoredRoots),
  },
})
