import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const targetFile = path.join(
  process.cwd(),
  "node_modules/react-native-svg/common/cpp/react/renderer/components/rnsvg/RNSVGLayoutableShadowNode.cpp",
)

if (!existsSync(targetFile)) {
  process.exit(0)
}

const source = readFileSync(targetFile, "utf8")
const patched = source
  .replace("yoga::StyleSizeLength::percent(100)", "yoga::Style::Length::percent(100)")
  .replace("yoga::StyleSizeLength::percent(100)", "yoga::Style::Length::percent(100)")

if (patched !== source) {
  writeFileSync(targetFile, patched, "utf8")
  console.log("[postinstall] patched react-native-svg Yoga compatibility for RN 0.76")
}
