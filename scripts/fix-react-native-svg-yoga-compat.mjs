import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const targetFile = path.join(
  process.cwd(),
  "node_modules/react-native-svg/common/cpp/react/renderer/components/rnsvg/RNSVGLayoutableShadowNode.cpp",
)
const reactNativePackageFile = path.join(process.cwd(), "node_modules/react-native/package.json")

if (!existsSync(targetFile) || !existsSync(reactNativePackageFile)) {
  process.exit(0)
}

const reactNativePackage = JSON.parse(readFileSync(reactNativePackageFile, "utf8"))
const [majorPart = "0", minorPart = "0"] = String(reactNativePackage.version).split(".")
const major = Number.parseInt(majorPart, 10)
const minor = Number.parseInt(minorPart, 10)
const useModernYogaSizeLength = major > 0 || minor >= 81

const source = readFileSync(targetFile, "utf8")
const from = useModernYogaSizeLength ? "yoga::Style::Length::percent(100)" : "yoga::StyleSizeLength::percent(100)"
const to = useModernYogaSizeLength ? "yoga::StyleSizeLength::percent(100)" : "yoga::Style::Length::percent(100)"
const patched = source.replaceAll(from, to)

if (patched !== source) {
  writeFileSync(targetFile, patched, "utf8")
  console.log(
    `[postinstall] patched react-native-svg Yoga compatibility for React Native ${reactNativePackage.version}`,
  )
}
