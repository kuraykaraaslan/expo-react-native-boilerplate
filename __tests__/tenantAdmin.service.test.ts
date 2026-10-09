import { ApiKeyClientService } from "@/services/platform/apiKey.service.client";
import { DomainClientService } from "@/services/platform/domain.service.client";
import { TENANT_ID } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const key = {
  apiKeyId: "k1",
  tenantId: TENANT_ID,
  name: "CI",
  description: null,
  scopes: ["read"],
  keyEnv: "live",
  ipAllowlist: [],
  isActive: true,
  lastUsedAt: null,
  lastUsedIp: null,
  usageCount: "3", // some drivers hand counts back as strings
  successorKeyId: null,
  expiresAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
};

const domain = {
  tenantDomainId: "d1",
  tenantId: TENANT_ID,
  domain: "app.example.com",
  isPrimary: false,
  domainStatus: "PENDING",
  verifiedAt: null,
  sslStatus: "DISABLED",
  sslIssuedAt: null,
  sslExpiresAt: null,
  sslIssuer: null,
  sslLastCheckedAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
};

beforeEach(() => signIn(TENANT_ID));

describe("ApiKeyClientService", () => {
  it("lists keys and coerces the usage count", async () => {
    const seen = mockRoute("get", "/api-keys", { keys: [key], total: 1 });
    const res = await ApiKeyClientService.list({ pageSize: 50 });
    expect(res.keys[0]).toMatchObject({ apiKeyId: "k1", usageCount: 3 });
    expect(seen[0].query).toEqual({ page: "1", pageSize: "50" });
  });

  it("returns the plaintext key from create and sends only the allowed fields", async () => {
    const seen = mockRoute("post", "/api-keys", () => ({ body: { key, rawKey: "sk_live_abc" }, init: { status: 201 } }));
    const issued = await ApiKeyClientService.create({ name: "CI", scopes: ["read"] });
    expect(issued.rawKey).toBe("sk_live_abc");
    expect(seen[0].body).toEqual({ name: "CI", scopes: ["read"] });
  });

  it("rejects a key with no scope before any request", async () => {
    const seen = mockRoute("post", "/api-keys", { key, rawKey: "x" });
    await expect(ApiKeyClientService.create({ name: "CI", scopes: [] })).rejects.toThrow();
    expect(seen).toHaveLength(0);
  });

  it("rotates with the server's default grace window unless one is given", async () => {
    const seen = mockRoute("post", "/api-keys/k1/rotate", { key, rawKey: "sk_live_new" });
    await ApiKeyClientService.rotate("k1");
    await ApiKeyClientService.rotate("k1", 0);
    expect(seen.map((r) => r.body)).toEqual([{}, { graceSeconds: 0 }]);
  });

  it("revokes one key and reports how many revoke-all switched off", async () => {
    const del = mockRoute("delete", "/api-keys/k1", { message: "API key revoked successfully." });
    await ApiKeyClientService.revoke("k1");
    expect(del).toHaveLength(1);
    mockRoute("post", "/api-keys/revoke-all", { message: "ok", revokedCount: 4 });
    await expect(ApiKeyClientService.revokeAll()).resolves.toBe(4);
  });

  it("offers only active scope definitions", async () => {
    mockRoute("get", "/api-keys/scope-definitions", {
      data: [{ scope: "invoices:read", label: "Invoices (read)", isActive: true }, { scope: "old:read", isActive: false }],
      total: 2,
    });
    const defs = await ApiKeyClientService.getScopeDefinitions();
    expect(defs.map((d) => d.scope)).toEqual(["invoices:read"]);
  });

  it("surfaces a plan-gate refusal as such", async () => {
    mockRoute("post", "/api-keys", () => fail(403, { message: "This feature is not available on your current plan", code: "FEATURE_NOT_AVAILABLE" }));
    await expect(ApiKeyClientService.create({ name: "CI", scopes: ["read"] })).rejects.toMatchObject({ response: { status: 403 } });
  });
});

describe("DomainClientService", () => {
  it("lists domains", async () => {
    mockRoute("get", "/domains", { success: true, domains: [domain], total: 1 });
    const res = await DomainClientService.list();
    expect(res.domains[0]).toMatchObject({ domain: "app.example.com", domainStatus: "PENDING" });
  });

  it("reads the DNS record with the domain, and tolerates a verified domain having none", async () => {
    mockRoute("get", "/domains/d1", {
      success: true,
      domain,
      verification: { domain: "app.example.com", method: "TXT", recordName: "_verify.app.example.com", recordValue: "tok", domainStatus: "PENDING" },
    });
    expect((await DomainClientService.get("d1")).verification?.recordName).toBe("_verify.app.example.com");
    mockRoute("get", "/domains/d1", { success: true, domain: { ...domain, domainStatus: "VERIFIED" }, verification: null });
    expect((await DomainClientService.get("d1")).verification).toBeNull();
  });

  it("adds a normalized hostname as non-primary", async () => {
    const seen = mockRoute("post", "/domains", { success: true, domain });
    await DomainClientService.create("  App.Example.COM ");
    expect(seen[0].body).toEqual({ domain: "app.example.com", isPrimary: false });
  });

  it("treats 'not verified yet' as an answer, not an error", async () => {
    mockRoute("post", "/domains/d1/verify", { success: true, isVerified: false, message: "Verification failed. Please check your DNS settings." });
    await expect(DomainClientService.verify("d1")).resolves.toMatchObject({ isVerified: false });
  });

  it("checks SSL and removes a domain", async () => {
    const ssl = mockRoute("post", "/domains/d1/ssl-check", { success: true, ssl: {} });
    const del = mockRoute("delete", "/domains/d1", { success: true });
    await DomainClientService.checkSsl("d1");
    await DomainClientService.remove("d1");
    expect(ssl).toHaveLength(1);
    expect(del).toHaveLength(1);
  });
});
