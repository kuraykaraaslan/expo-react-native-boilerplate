import { ConfigContext, ExpoConfig } from "expo/config";

// Passkeys (Phase 11): the relying-party host the OS must tie this app to. Empty = no associated domain is written
// (passkeys stay off). Must equal the server's WEBAUTHN_RP_ID and EXPO_PUBLIC_PASSKEY_RP_ID (libs/env).
const passkeyRpId = process.env.EXPO_PUBLIC_PASSKEY_RP_ID?.trim() || undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.EXPO_PUBLIC_APP_NAME ?? "App",
  slug: "expo-react-native-boilerplate",
  version: process.env.EXPO_PUBLIC_APP_VERSION ?? "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "expoboilerplate",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    // Override per build with EXPO_PUBLIC_IOS_BUNDLE_ID; the server's MOBILE_IOS_APP_IDS must be `<TeamID>.<this id>`.
    bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID?.trim() || "com.kuraykaraaslan.boilerplate",
    ...(passkeyRpId ? { associatedDomains: [`webcredentials:${passkeyRpId}`] } : {}),
    infoPlist: {
      NSFaceIDUsageDescription: "Use Face ID to access your secure data",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    // Override per build with EXPO_PUBLIC_ANDROID_PACKAGE; the server's MOBILE_ANDROID_PACKAGE_NAME must be the same.
    package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE?.trim() || "com.kuraykaraaslan.boilerplate",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to choose a profile photo from your library.",
        cameraPermission: "Allow $(PRODUCT_NAME) to take a profile photo.",
        microphonePermission: false,
      },
    ],
    [
      // Remote push (Phase 8). Needs a development build; Expo Go cannot receive remote push on SDK 53+.
      // Credentials are the owner's: FCM (google-services.json / EAS) and an APNs key via `eas credentials`.
      "expo-notifications",
      { defaultChannel: "default" },
    ],
    ["expo-local-authentication", { faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID to unlock the app." }],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        image: "./assets/images/splash.png",
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || process.env.EAS_PROJECT_ID || undefined,
    },
  },
});
