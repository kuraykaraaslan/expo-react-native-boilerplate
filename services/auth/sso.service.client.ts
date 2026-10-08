import axiosInstance from "@/libs/axios";
import {
  ConnectedAccount,
  SocialAccountsResponseSchema,
  SSOAuthUrlResponse,
  SSOAuthUrlResponseSchema,
  SSOProvider,
  SSOProvidersResponseSchema,
} from "@/services/auth/sso.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.
// Both routes are public (no bearer needed).
//
// NOTE (K4): the OAuth callback on the server mints a `web` audience token and
// redirects to a web URL, so a device cannot finish an SSO login yet — see
// phases/auth_sso. These calls only discover providers and build the URL.

export class SSOClientService {
  /** Providers this tenant allows (providers unknown to this app version are dropped). */
  static async getProviders(): Promise<SSOProvider[]> {
    const res = await axiosInstance.get("/auth/sso", { skipAuth: true });
    return SSOProvidersResponseSchema.parse(res.data).providers;
  }

  /** The provider's authorization URL and the OAuth `state` (`{tenantId}.{uuid}`). */
  static async getAuthUrl(provider: SSOProvider): Promise<SSOAuthUrlResponse> {
    const res = await axiosInstance.get(`/auth/sso/${encodeURIComponent(provider)}`, { skipAuth: true });
    return SSOAuthUrlResponseSchema.parse(res.data);
  }

  /** GET /auth/me/social-accounts - linked identities, read-only (linking waits for the server change, K4). */
  static async getSocialAccounts(): Promise<ConnectedAccount[]> {
    const res = await axiosInstance.get("/auth/me/social-accounts");
    return SocialAccountsResponseSchema.parse(res.data).accounts;
  }
}
