import { configureTheme } from "kui-native/libs/theme";

// ============================================================================
// Brand tokens — kui-native ships a blue primary; this app is deep orange.
// Imported once at the top of app/_layout.tsx so it runs before first render
// (configureTheme does not re-render mounted components).
// ============================================================================

configureTheme({
  light: {
    primary: "#f4511e",
    "primary-hover": "#e64a19",
    "primary-active": "#d84315",
    "primary-subtle": "#fff5f2",
    "primary-fg": "#ffffff",
    "border-focus": "#f4511e",
  },
  dark: {
    primary: "#f4511e",
    "primary-hover": "#ff7043",
    "primary-active": "#e64a19",
    "primary-subtle": "#431407",
    "primary-fg": "#ffffff",
    "border-focus": "#ff7043",
  },
});
