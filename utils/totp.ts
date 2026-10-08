/** "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP": easier to read and type into an authenticator app. */
export function formatSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/** Keeps digits only, at most six — what the code inputs accept. */
export function sanitizeCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export const isCompleteCode = (value: string): boolean => /^\d{6}$/.test(value);
