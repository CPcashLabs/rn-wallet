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

if (missingFiles.length || missingDirs.length || failedChecks.length) {
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

  process.exit(1)
}

console.log("[repo verify] passed")
console.log(`checked ${requiredFiles.length} files, ${requiredDirs.length} directories and ${checks.length} content rules`)
