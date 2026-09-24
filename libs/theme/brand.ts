import { configureTheme } from "kui-native/libs/theme";
import { configureFonts } from "kui-native/libs/utils/typography";

// ============================================================================
// Brand tokens + font — match next-boilerplate (app/globals.css) so web and mobile
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

// Inter, as next-boilerplate. Per-weight families from @expo-google-fonts/inter
// (loaded by useFonts in app/_layout.tsx); kui-native picks the family per weight,
// so font-medium / font-semibold / font-bold render the real cut on Android too.
configureFonts({
  sans: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semiBold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
});
