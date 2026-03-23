import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

// ---------------------------------------------------------------------------
// Feature index bypass allowlist
//
// These are existing violations where app/ code imports from a feature's
// internal path instead of its public index.ts. Do not add new entries.
// Remove entries when the import is updated to use the feature root.
// ---------------------------------------------------------------------------
const LEGACY_FEATURE_BYPASS_ALLOWLIST = new Set([
  // intentionally empty — all app/ imports have been migrated to index.ts
])

// ---------------------------------------------------------------------------
// Bare query key allowlist
//
// These are existing violations that predate this rule. Each entry is
// "relativePath:lineNumber". Do not add new entries without a plan to remove
// them. Remove entries as violations are fixed.
// ---------------------------------------------------------------------------
const LEGACY_BARE_QUERY_KEY_ALLOWLIST = new Set([
  "src/plugins/copouch/screens/CopouchAllocationScreens.tsx:39",
])

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"])

function collectSourceFiles(dirPath) {
  const absoluteDir = path.join(root, dirPath)
  if (!fs.existsSync(absoluteDir)) return []

  const results = []

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue

      const absoluteEntryPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        walk(absoluteEntryPath)
        continue
      }

      const ext = path.extname(entry.name)
      if (!SOURCE_EXTENSIONS.has(ext)) continue

      const relativePath = path.relative(root, absoluteEntryPath).replaceAll(path.sep, "/")

      // skip test files
      if (relativePath.includes(".test.") || relativePath.includes(".spec.")) continue

      results.push(relativePath)
    }
  }

  walk(absoluteDir)
  return results
}

// ---------------------------------------------------------------------------
// Rule: query keys must use a factory function, not a bare string literal array.
//
// Prohibited:  queryKey: ["scope", arg]
// Allowed:     queryKey: scopeKeys.method(arg)
// Allowed:     queryKey: scopeKeys.all
// Allowed:     queryKey: [...scopeKeys.all, "suffix"]
//
// Detection heuristic: flag any line where `queryKey:` is followed by an
// opening bracket and then immediately a string literal quote character.
// The spread pattern `[...` is not flagged because the character after `[` is `.`.
// ---------------------------------------------------------------------------
const BARE_QUERY_KEY_RE = /queryKey\s*:\s*\[['"`]/

function checkBareQueryKeys(sourceFiles) {
  const violations = []

  for (const filePath of sourceFiles) {
    const lines = fs.readFileSync(path.join(root, filePath), "utf8").split("\n")

    lines.forEach((line, index) => {
      if (!BARE_QUERY_KEY_RE.test(line)) return

      const lineNumber = index + 1
      const allowlistKey = `${filePath}:${lineNumber}`

      if (LEGACY_BARE_QUERY_KEY_ALLOWLIST.has(allowlistKey)) return

      violations.push({
        file: filePath,
        line: lineNumber,
        text: line.trim(),
        rule: "bare-query-key",
        message: `Use a query key factory instead of a bare string literal array. See docs/architecture/data-fetching.md`,
      })
    })
  }

  return violations
}

// ---------------------------------------------------------------------------
// Rule: app/ must import from a feature root (@/features/name), not from
// internal subpaths (@/features/name/screens/Something).
//
// Allowed:   import { LoginScreen } from "@/features/auth"
// Prohibited: import { LoginScreen } from "@/features/auth/screens/LoginScreen"
//
// This rule only applies to files under src/app/. Cross-feature internal
// imports are tracked separately in the architecture violation check.
// ---------------------------------------------------------------------------
const FEATURE_INTERNAL_IMPORT_RE = /from\s+["']@\/features\/[^/'"]+\/[^'"]+["']/

function checkFeatureIndexBypass(sourceFiles) {
  const appFiles = sourceFiles.filter(f => f.startsWith("src/app/"))
  const violations = []

  for (const filePath of appFiles) {
    const lines = fs.readFileSync(path.join(root, filePath), "utf8").split("\n")

    lines.forEach((line, index) => {
      if (!FEATURE_INTERNAL_IMPORT_RE.test(line)) return

      const lineNumber = index + 1
      const allowlistKey = `${filePath}:${lineNumber}`

      if (LEGACY_FEATURE_BYPASS_ALLOWLIST.has(allowlistKey)) return

      violations.push({
        file: filePath,
        line: lineNumber,
        text: line.trim(),
        rule: "feature-index-bypass",
        message: `Import from the feature root instead of an internal path. See docs/architecture/module-boundaries.md`,
      })
    })
  }

  return violations
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const sourceFiles = collectSourceFiles("src")
const allViolations = [...checkBareQueryKeys(sourceFiles), ...checkFeatureIndexBypass(sourceFiles)]

if (allViolations.length) {
  console.error("[conventions verify] failed")
  console.error("Convention violations:")
  for (const v of allViolations) {
    console.error(`- ${v.file}:${v.line}  ${v.rule}: ${v.text}`)
    console.error(`  ${v.message}`)
  }
  process.exit(1)
}

console.log("[conventions verify] passed")
console.log(`checked ${sourceFiles.length} source files`)
