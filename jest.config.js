/** @type {import('jest-expo').JestPreset} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  // jest-expo resolves the "react-native" export condition, under which msw
  // hides `msw/node`. Tests run in Node, so resolve exports as Node would.
  testEnvironmentOptions: { customExportConditions: ["node", "require", "default"] },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // msw pulls in ESM-only deps (rettime ships .mjs); let babel-jest handle them.
  transform: { "^.+\\.mjs$": "babel-jest" },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|sonner-native|msw|@mswjs/.*|rettime|until-async|@open-draft/.*|headers-polyfill)",
  ],
  testRegex: "\\.(test|spec)\\.(ts|tsx)$",
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/\\.junk/"],
  collectCoverageFrom: [
    "hooks/**/*.ts",
    "stores/**/*.ts",
    "libs/**/*.ts",
    "components/**/*.tsx",
  ],
};
