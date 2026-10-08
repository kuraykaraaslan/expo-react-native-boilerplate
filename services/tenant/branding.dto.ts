import { z } from "zod";

// ============================================================================
// Tenant branding — mirror of next-boilerplate tenant_branding.
// GET /settings/public is a GUEST route (no token needed), so branding can be
// read before sign-in. Settings values are strings; keys the tenant never set
// are simply absent. Only colors are used on native (A1/A2): customCss and
// customJs are web-only and are never read.
// ============================================================================

/** GET /settings/public → `{ success, settings: { brandName?, brandPrimaryColor?, … }, tenant: { name } | null }`. */
export const PublicBrandingResponseSchema = z.object({
  success: z.boolean().optional(),
  settings: z.record(z.string()).default({}),
  tenant: z.object({ name: z.string() }).nullish(),
});
export type PublicBrandingResponse = z.infer<typeof PublicBrandingResponseSchema>;
