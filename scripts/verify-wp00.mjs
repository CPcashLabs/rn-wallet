import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

const requiredFiles = [
  "package.json",
  "app.json",
  "index.js",
  "babel.config.js",
  "metro.config.js",
  "react-native.config.js",
  "tsconfig.json",
  "src/app/App.tsx",
  "src/app/navigation/RootNavigator.tsx",
  "src/app/navigation/BootstrapGate.tsx",
  "src/app/providers/AppProviders.tsx",
  "src/shared/api/client.ts",
  "src/shared/api/interceptors.ts",
  "src/shared/api/auth-session.ts",
  "src/shared/storage/secureStorage.ts",
  "src/shared/storage/kvStorage.ts",
  "src/shared/store/useAuthStore.ts",
  "src/shared/store/useThemeStore.ts",
  "src/shared/store/useSocketStore.ts",
  "src/shared/native/passkeyAdapter.ts",
  "src/shared/native/walletAdapter.ts",
  "src/shared/native/shareAdapter.ts",
  "src/shared/native/scannerAdapter.ts",
  "src/shared/native/fileAdapter.ts",
  "src/shared/native/deepLinkAdapter.ts",
  "src/shared/native/websocketAdapter.ts",
  "src/shared/i18n/index.ts",
  "src/shared/theme/tokens.ts",
]

const requiredDirs = [
  "android",
  "ios",
  "src/app/navigation",
  "src/app/providers",
  "src/features/auth",
  "src/features/home",
  "src/features/support",
  "src/shared/api",
  "src/shared/store",
  "src/shared/storage",
  "src/shared/i18n",
  "src/shared/theme",
  "src/shared/native",
]

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))

const requiredDeps = [
  "@react-navigation/native",
  "@react-navigation/native-stack",
  "@react-navigation/bottom-tabs",
  "@tanstack/react-query",
  "axios",
  "i18next",
  "react",
  "react-i18next",
  "react-native",
  "react-native-gesture-handler",
  "react-native-keychain",
  "react-native-mmkv",
  "react-native-safe-area-context",
  "react-native-screens",
  "zod",
  "zustand",
]

const requiredDevDeps = [
  "@react-native-community/cli",
  "@react-native/babel-preset",
  "@react-native/metro-config",
  "@react-native/typescript-config",
  "babel-plugin-module-resolver",
  "typescript",
]

const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(root, file)))
const missingDirs = requiredDirs.filter(dir => !fs.existsSync(path.join(root, dir)))
const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep])
const missingDevDeps = requiredDevDeps.filter(dep => !packageJson.devDependencies?.[dep])

const bootstrapFile = fs.readFileSync(path.join(root, "src/app/navigation/BootstrapGate.tsx"), "utf8")
const interceptorsFile = fs.readFileSync(path.join(root, "src/shared/api/interceptors.ts"), "utf8")
const deepLinkFile = fs.readFileSync(path.join(root, "src/shared/native/deepLinkAdapter.ts"), "utf8")

const checks = [
  {
    name: "BootstrapGate has AuthStack reset path",
    passed: bootstrapFile.includes('name: "AuthStack"'),
  },
  {
    name: "BootstrapGate has MainTabs reset path",
    passed: bootstrapFile.includes('name: "MainTabs"'),
  },
  {
    name: "Interceptors handle 401",
    passed: interceptorsFile.includes("AuthExpiredError") && interceptorsFile.includes("unauthorizedHandler?.()"),
  },
  {
    name: "Deep link adapter exposes parse()",
    passed: deepLinkFile.includes("parse(url)") || deepLinkFile.includes("parse(url:"),
  },
]

const failedChecks = checks.filter(item => !item.passed)

if (missingFiles.length || missingDirs.length || missingDeps.length || missingDevDeps.length || failedChecks.length) {
  console.error("[WP-00 verify] failed")

  if (missingFiles.length) {
    console.error("Missing files:")
    for (const file of missingFiles) console.error(`- ${file}`)
  }

  if (missingDirs.length) {
    console.error("Missing dirs:")
    for (const dir of missingDirs) console.error(`- ${dir}`)
  }

  if (missingDeps.length) {
    console.error("Missing dependencies:")
    for (const dep of missingDeps) console.error(`- ${dep}`)
  }

  if (missingDevDeps.length) {
    console.error("Missing devDependencies:")
    for (const dep of missingDevDeps) console.error(`- ${dep}`)
  }

  if (failedChecks.length) {
    console.error("Failed content checks:")
    for (const check of failedChecks) console.error(`- ${check.name}`)
  }

  process.exit(1)
}

console.log("[WP-00 verify] passed")
console.log(`checked ${requiredFiles.length} files, ${requiredDirs.length} directories and ${checks.length} content rules`)
