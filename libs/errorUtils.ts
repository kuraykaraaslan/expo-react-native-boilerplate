import { toast } from 'sonner-native';
import { extractErrorMessage } from '@/dto/common.dto';
import logger from '@/libs/logger';

/**
 * Call in every catch block. Logs technical detail to console and shows
 * a user-friendly toast. Never call toast.error() directly for API errors.
 *
 * Usage: handleApiError(err, 'LoginScreen')
 */
export function handleApiError(err: unknown, context?: string): void {
  logger.error(`[${context ?? 'API'}]`, err);
  toast.error(extractErrorMessage(err));
}
