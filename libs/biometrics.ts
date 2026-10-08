import * as LocalAuthentication from "expo-local-authentication";
import logger from "@/libs/logger";

// ============================================================================
// Thin wrapper over expo-local-authentication. Every call is failure-safe: a
// platform without the module (web, old devices) simply reports "unavailable".
// The device passcode counts: a user with no biometrics enrolled can still use
// the app lock through the system fallback.
// ============================================================================

/** True when the device has a screen lock of any kind (passcode, pattern or biometrics). */
export async function deviceAuthAvailable(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch (err) {
    logger.warn("[biometrics] availability check failed", err);
    return false;
  }
}

/** Shows the system prompt. Resolves false on cancel, failure or when unsupported — never throws. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage });
    return result.success;
  } catch (err) {
    logger.warn("[biometrics] authenticate failed", err);
    return false;
  }
}
