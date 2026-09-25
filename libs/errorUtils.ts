import { toast } from 'sonner-native';
import { isHandled, normalizeApiError } from '@/libs/apiError';
import logger from '@/libs/logger';

/**
 * Call in every catch block. Logs technical detail and shows a user-friendly
 * toast. Never call toast.error() directly for API errors.
 * Skips the toast when the transport already told the user (session ended,
 * OTP gate) so one failure never produces two toasts.
 *
 * Usage: handleApiError(err, 'LoginScreen')
 */
export function handleApiError(err: unknown, context?: string): void {
  const e = normalizeApiError(err);
  logger.error(`[${context ?? 'API'}]`, e.statusCode ?? '-', e.code ?? '-', e.rawMessage ?? e.message);
  if (!isHandled(err)) toast.error(e.message);
}
