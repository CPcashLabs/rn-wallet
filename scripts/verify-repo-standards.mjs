import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

const requiredFiles = [
  "README.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "LICENSE",
  "docs/README.md",
  "docs/architecture/source-layout.md",
  "tests/README.md",
  "tests/integration/README.md",
  "e2e/README.md",
  "jest.integration.config.js",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/feature_request.md",
  "scripts/verify-repo-standards.mjs",
]

const requiredDirs = [
  "docs",
  "docs/architecture",
  "tests",
  "tests/integration",
  "e2e",
  ".github",
  ".github/ISSUE_TEMPLATE",
]

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8")
const contributing = fs.readFileSync(path.join(root, "CONTRIBUTING.md"), "utf8")
const docsIndex = fs.readFileSync(path.join(root, "docs/README.md"), "utf8")
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])
const LEGACY_CROSS_FEATURE_ALLOWLIST = new Set([
  "src/features/address-book/screens/AddressBookEditScreen.tsx -> home",
  "src/features/auth/services/authSessionOrchestrator.ts -> home",
  "src/features/home/screens/HomeShellScreen.tsx -> auth",
  "src/features/home/screens/HomeShellScreen.tsx -> messages",
  "src/features/messages/screens/MessageScreen.tsx -> home",
  "src/features/messages/utils/messagePresentation.ts -> home",
  "src/features/orders/components/OrdersUi.tsx -> home",
  "src/features/orders/screens/LabelManagementScreen.tsx -> home",
  "src/features/orders/screens/OrderDetailScreen.tsx -> home",
  "src/features/orders/screens/OrderDetailScreen.tsx -> settings",
  "src/features/orders/screens/OrderFollowupScreens.tsx -> home",
  "src/features/orders/screens/OrderFollowupScreens.tsx -> settings",
  "src/features/orders/screens/OrderRecordsScreens.tsx -> home",
  "src/features/orders/screens/TagsNotesScreen.tsx -> home",
  "src/features/orders/utils/orderHelpers.ts -> home",
  "src/features/settings/screens/SettingsEmailScreens.tsx -> home",
  "src/features/settings/screens/SettingsHelpScreens.tsx -> home",
  "src/features/settings/screens/SettingsInviteScreens.tsx -> auth",
  "src/features/settings/screens/SettingsInviteScreens.tsx -> home",
  "src/features/settings/screens/SettingsInviteScreens.tsx -> invite",
  "src/features/settings/screens/SettingsPreferenceScreens.tsx -> home",
  "src/features/settings/screens/settingsShared.tsx -> home",
])

const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(root, file)))
const missingDirs = requiredDirs.filter(dir => !fs.existsSync(path.join(root, dir)))

const checks = [
  {
    name: "package.json exposes check:repo",
    passed: packageJson.scripts?.["check:repo"] === "node ./scripts/verify-repo-standards.mjs",
  },
  {
    name: "package.json exposes test:integration",
    passed: packageJson.scripts?.["test:integration"] === "jest --config jest.integration.config.js --runInBand",
  },
  {
    name: "README includes Architecture section",
    passed: readme.includes("## Architecture"),
  },
  {
    name: "README includes Repository Layout section",
    passed: readme.includes("## Repository Layout"),
  },
  {
    name: "CONTRIBUTING includes Architecture Rules section",
    passed: contributing.includes("## Architecture Rules"),
  },
  {
    name: "docs index links source layout",
    passed: docsIndex.includes("architecture/source-layout.md"),
  },
  {
    name: "README documents test layout",
    passed: readme.includes("## Test Layout"),
  },
]

const failedChecks = checks.filter(item => !item.passed)

function isSourceFile(filePath) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath)) && !filePath.includes(".test.") && !filePath.includes(".spec.")
}

function collectSourceFiles(dirPath) {
  const absoluteDir = path.join(root, dirPath)
  if (!fs.existsSync(absoluteDir)) {
    return []
  }

  const results = []

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue
      }

      const absoluteEntryPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        walk(absoluteEntryPath)
        continue
      }

      const relativePath = path.relative(root, absoluteEntryPath).replaceAll(path.sep, "/")
      if (isSourceFile(relativePath)) {
        results.push(relativePath)
      }
    }
  }

  walk(absoluteDir)
  return results
}

function collectImports(relativeFilePath) {
  const content = fs.readFileSync(path.join(root, relativeFilePath), "utf8")
  return Array.from(content.matchAll(/from\s+["'](@\/[^"']+)["']/g), match => match[1])
}

const architectureViolations = []

for (const filePath of collectSourceFiles("src")) {
  const imports = collectImports(filePath)

  for (const importedPath of imports) {
    if (filePath.startsWith("src/shared/") && (importedPath.startsWith("@/app/") || importedPath.startsWith("@/features/"))) {
      architectureViolations.push(`${filePath} must not import ${importedPath}`)
      continue
    }

    if ((filePath.startsWith("src/domains/") || filePath.startsWith("src/plugins/")) && importedPath.startsWith("@/features/")) {
      architectureViolations.push(`${filePath} must not import ${importedPath}`)
      continue
    }

    if (!filePath.startsWith("src/features/") || !importedPath.startsWith("@/features/")) {
      continue
    }

    const currentFeature = filePath.split("/")[2]
    const importedFeature = importedPath.split("/")[2]
    if (!currentFeature || !importedFeature || currentFeature === importedFeature) {
      continue
    }

    const allowlistKey = `${filePath} -> ${importedFeature}`
    if (!LEGACY_CROSS_FEATURE_ALLOWLIST.has(allowlistKey)) {
      architectureViolations.push(`${filePath} must not import ${importedPath}`)
    }
  }
}

if (missingFiles.length || missingDirs.length || failedChecks.length || architectureViolations.length) {
  console.error("[repo verify] failed")

  if (missingFiles.length) {
    console.error("Missing files:")
    for (const file of missingFiles) console.error(`- ${file}`)
  }

  if (missingDirs.length) {
    console.error("Missing dirs:")
    for (const dir of missingDirs) console.error(`- ${dir}`)
  }

  if (failedChecks.length) {
    console.error("Failed content checks:")
    for (const check of failedChecks) console.error(`- ${check.name}`)
  }

  if (architectureViolations.length) {
    console.error("Architecture violations:")
    for (const violation of architectureViolations) console.error(`- ${violation}`)
  }

  process.exit(1)
}

console.log("[repo verify] passed")
console.log(
  `checked ${requiredFiles.length} files, ${requiredDirs.length} directories, ${checks.length} content rules and ${collectSourceFiles("src").length} source files`,
)
