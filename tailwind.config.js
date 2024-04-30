/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./app/**/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {



          "primary": "#00aaff",

          "secondary": "#00dea6",

          "accent": "#00ae79",

          "neutral": "#311e1d",

          "base-100": "#3d3f4d",

          "base-200": "#282a3a",

          "base-300": "#242534",

          "base-400": "#20212e",

          "base-500": "#101017",

          "info": "#00b1d2",

          "success": "#33f16a",

          "warning": "#d52d00",

          "error": "#fd0e3d",
        },
        light: {

          "primary": "#7100ff",

          "secondary": "#007e9b",

          "accent": "#005bef",

          "neutral": "#0b0200",

          "base-100": "#ffffd8",

          "base-200": "#f3f3f3",

          "base-300": "#e9e9e9",

          "base-400": "#dfdfdf",

          "base-500": "#cfcfcf",


          "info": "#00d6ff",

          "success": "#00ff7c",

          "warning": "#fb6d00",

          "error": "#ff5365",
        }
      },
    ],
  },
};