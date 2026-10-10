import { ConfigContext, ExpoConfig } from "expo/config";

// Passkeys (Phase 11): the relying-party host the OS must tie this app to. Empty = no associated domain is written
// (passkeys stay off). Must equal the server's WEBAUTHN_RP_ID and EXPO_PUBLIC_PASSKEY_RP_ID (libs/env).
const passkeyRpId = process.env.EXPO_PUBLIC_PASSKEY_RP_ID?.trim() || undefined;

// Deep links (phase 6 SSO return + phase 7 invitation e-mail links). Nothing is invented: with the variables unset no
// associated domain / intent filter is written and only the custom scheme (`<scheme>://auth/callback`) is registered.
// The paths below are the ones the server claims in its association files (next-boilerplate
// modules/common/server/mobile-app-links.ts): /auth/invitation/* (domain tenancy) and /t/<tenantId>/auth/invitation/*
// (path tenancy). `/tenant/<tenantId>/...` (the e-mail fallback when a tenant has no active domain) is Android-only:
// the server's apple-app-site-association does not list it, so iOS cannot open it as a universal link.
const scheme = /^[a-z][a-z0-9+.-]*$/i.test(process.env.EXPO_PUBLIC_APP_SCHEME?.trim() ?? "")
  ? process.env.EXPO_PUBLIC_APP_SCHEME!.trim().toLowerCase()
  : "expoboilerplate";
// EXPO_PUBLIC_ASSOCIATED_DOMAIN: comma-separated bare hostnames; anything with a scheme, port or path is dropped.
const associatedHosts = (process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN ?? "")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter((host) => /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host));
const iosAssociatedDomains = [
  ...(passkeyRpId ? [`webcredentials:${passkeyRpId}`] : []),
  ...associatedHosts.map((host) => `applinks:${host}`),
];
const androidIntentFilters = associatedHosts.length
  ? [
      {
        action: "VIEW",
        autoVerify: true,
        data: associatedHosts.flatMap((host) => [
          { scheme: "https", host, pathPrefix: "/auth/invitation" },
          { scheme: "https", host, pathPattern: "/t/.*/auth/invitation/.*" },
          { scheme: "https", host, pathPattern: "/tenant/.*/auth/invitation/.*" },
        ]),
        category: ["BROWSABLE", "DEFAULT"],
      },
    ]
  : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.EXPO_PUBLIC_APP_NAME ?? "App",
  slug: "expo-react-native-boilerplate",
  version: process.env.EXPO_PUBLIC_APP_VERSION ?? "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    // Override per build with EXPO_PUBLIC_IOS_BUNDLE_ID; the server's MOBILE_IOS_APP_IDS must be `<TeamID>.<this id>`.
    bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID?.trim() || "com.kuraykaraaslan.boilerplate",
    ...(iosAssociatedDomains.length > 0 ? { associatedDomains: iosAssociatedDomains } : {}),
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
    ...(androidIntentFilters.length > 0 ? { intentFilters: androidIntentFilters } : {}),
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
