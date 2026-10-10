import { normalizeApiError } from '@/libs/apiError';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { SSOClientService } from '@/services/auth/sso.service.client';

/**
 * Whether the signed-in account has a password the person set (so re-authentication must ask for it).
 * Mirrors the server's rule (`PrivacySelfServiceService.assertReauthenticated`): an account has its own
 * password when `passwordChangedAt` is stamped, or when it has no linked social sign-in at all; a
 * social-only account holds just a random password nobody knows and is proven by its live session.
 *
 * Returns `null` when either read fails: the caller then asks for the password, and the server has the
 * last word (400 PASSWORD_REQUIRED if one was needed after all).
 */
export async function accountHasOwnPassword(): Promise<boolean | null> {
  try {
    const [security, social] = await Promise.all([AuthClientService.getSecurity(), SSOClientService.getSocialAccounts()]);
    return Boolean(security.passwordChangedAt) || social.length === 0;
  } catch {
    return null;
  }
}

export type ReauthFailure = 'password-required' | 'invalid-password';

// Server constants of privacy.messages.ts (PASSWORD_REQUIRED 400, INVALID_PASSWORD 401).
const PASSWORD_REQUIRED_MESSAGE = 'Enter your password to confirm';
const INVALID_PASSWORD_MESSAGE = 'That password is not correct';

/** Classifies a self-service refusal that is about the password; null for every other error. */
export function reauthFailure(err: unknown): ReauthFailure | null {
  const { statusCode, rawMessage } = normalizeApiError(err);
  if (statusCode === 400 && rawMessage === PASSWORD_REQUIRED_MESSAGE) return 'password-required';
  if (statusCode === 401 && rawMessage === INVALID_PASSWORD_MESSAGE) return 'invalid-password';
  return null;
}
