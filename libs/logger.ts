import { env } from "@/libs/env";

// ============================================================================
// Logger — dev: console, prod: no-op
// ============================================================================

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.info("[INFO]", ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn("[WARN]", ...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error("[ERROR]", ...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug("[DEBUG]", ...args);
  },
};

export default logger;
