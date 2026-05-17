/** @type {import('jest-expo').JestPreset} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterFramework: ["<rootDir>/__tests__/setup.ts"],
  setupFiles: ["<rootDir>/__tests__/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|sonner-native)",
  ],
  testPathPattern: ".*\\.(test|spec)\\.(ts|tsx)$",
  collectCoverageFrom: [
    "hooks/**/*.ts",
    "stores/**/*.ts",
    "libs/**/*.ts",
    "components/**/*.tsx",
  ],
};
