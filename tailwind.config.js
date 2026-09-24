const { colors } = require("kui-native/libs/utils/tailwind-tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    // kui-native ships source; without this its classes are never generated.
    "./node_modules/kui-native/modules/ui/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors,
    },
  },
  plugins: [],
};
