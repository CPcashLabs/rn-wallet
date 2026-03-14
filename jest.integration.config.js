module.exports = {
  preset: "react-native",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/*.integration.test.ts", "**/*.integration.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/integration/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
}
