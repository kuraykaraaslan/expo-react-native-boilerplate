import { mapIncomingPath } from '@/libs/deepLinks';

/**
 * Runs for every URL that opens the app (custom scheme and verified https links) before Expo
 * Router matches it: invitation e-mail links are routed to /invitation, the SSO return is kept
 * off the router (see libs/deepLinks.ts).
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return mapIncomingPath(path);
}
