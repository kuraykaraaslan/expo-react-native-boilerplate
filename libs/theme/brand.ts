import { configureTheme } from "kui-native/libs/theme";

// ============================================================================
// Brand tokens — match next-boilerplate (app/globals.css) so web and mobile
// read as one product. Only the tokens where next-boilerplate differs from
// kui-native's defaults are listed. Mirror light values in global.css.
// Imported first in app/_layout.tsx so it runs before the first render.
// ============================================================================

configureTheme({
  light: {
    primary: "#2563eb",
    "primary-hover": "#1d4ed8",
    "primary-active": "#1e40af",
    "text-secondary": "#4b5563",
    "text-disabled": "#6b7280",
  },
  dark: {
    "text-disabled": "#8a99b0",
  },
});
