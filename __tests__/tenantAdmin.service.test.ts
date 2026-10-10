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

describe("API key reports", () => {
  it("reads the unwrapped activity report and coerces counts", async () => {
    const seen = mockRoute("get", "/api-keys/activity-report", {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-10-01T00:00:00.000Z",
      summary: { totalKeys: 1, activeKeys: 1, inactiveKeys: 0, expiredKeys: 0, neverUsed: 0, totalUsage: "7" },
      rows: [{ apiKeyId: "k1", name: "CI", keyEnv: "live", scopes: ["read"], usageCount: "7", lastUsedAt: null, lastUsedIp: null, isActive: true, expiresAt: null, createdAt: "2026-10-01T10:00:00.000Z" }],
    });
    const res = await ApiKeyClientService.getActivityReport();
    expect(seen[0].query).toEqual({});
    expect(res.summary.totalUsage).toBe(7);
    expect(res.rows[0]).toMatchObject({ apiKeyId: "k1", usageCount: 7, lastUsedAt: null });
  });

  it("tolerates a sparse activity report", async () => {
    mockRoute("get", "/api-keys/activity-report", {});
    const res = await ApiKeyClientService.getActivityReport();
    expect(res.rows).toEqual([]);
    expect(res.summary.totalKeys).toBe(0);
  });

  it("reads the rotation audit with an unnamed successor", async () => {
    mockRoute("get", "/api-keys/rotation-audit", {
      summary: { rotations: 1, graceActive: 1, revokedImmediately: 0 },
      rows: [{ apiKeyId: "k1", name: "CI", keyEnv: "live", successorKeyId: "k2", successorName: null, rotatedAt: "2026-10-02T10:00:00.000Z", graceExpiresAt: "2026-10-03T10:00:00.000Z", isActive: true }],
    });
    const res = await ApiKeyClientService.getRotationAudit();
    expect(res.summary.graceActive).toBe(1);
    expect(res.rows[0]).toMatchObject({ successorKeyId: "k2", successorName: null, isActive: true });
  });

  it("surfaces a refused report as such", async () => {
    mockRoute("get", "/api-keys/rotation-audit", () => fail(403, { message: "Forbidden" }));
    await expect(ApiKeyClientService.getRotationAudit()).rejects.toMatchObject({ response: { status: 403 } });
  });
});

describe("Domain timeline and report", () => {
  it("pages the timeline 1-based and keeps unknown severities", async () => {
    const seen = mockRoute("get", "/domains/d1/timeline", {
      success: true,
      logs: [
        { auditLogId: "a1", action: "tenant_domain.verify", severity: "weird", actorType: "USER", actorId: "u1", createdAt: "2026-10-02T10:00:00.000Z", metadata: { x: 1 } },
        { auditLogId: "a2", action: "tenant_domain.create", createdAt: "2026-10-01T10:00:00.000Z" },
      ],
      total: 2,
    });
    const res = await DomainClientService.getTimeline("d1");
    expect(seen[0].query).toEqual({ page: "1", pageSize: "20" });
    expect(res.total).toBe(2);
    expect(res.logs.map((l) => l.severity)).toEqual(["weird", "low"]);
    await DomainClientService.getTimeline("d1", { page: 3, pageSize: 5 });
    expect(seen[1].query).toEqual({ page: "3", pageSize: "5" });
  });

  it("unwraps the health report", async () => {
    mockRoute("get", "/domains/report", {
      success: true,
      report: {
        generatedAt: "2026-10-10T00:00:00.000Z",
        sslExpiryWarningDays: 14,
        snapshot: { totalDomains: 2, verified: 1, unverified: 1, dnsFailed: 0, sslActive: 1, sslExpiring: 0, sslFailed: 0, sslNone: 1, domainStatusBreakdown: [{ status: "VERIFIED", count: 1 }], sslStatusBreakdown: [] },
        sslExpiry: [{ tenantDomainId: "d1", domain: "app.example.com", sslStatus: "ACTIVE", sslIssuer: null, sslExpiresAt: "2026-10-20T00:00:00.000Z", daysUntilExpiry: 10, atRisk: true }],
        dnsAge: [{ tenantDomainId: "d2", domain: "b.example.com", domainStatus: "PENDING", verifiedAt: null, daysSinceVerified: null }],
      },
    });
    const report = await DomainClientService.getReport();
    expect(report.snapshot).toMatchObject({ totalDomains: 2, sslNone: 1 });
    expect(report.sslExpiry[0]).toMatchObject({ atRisk: true, daysUntilExpiry: 10 });
    expect(report.dnsAge[0].daysSinceVerified).toBeNull();
  });

  it("tolerates a report with only the wrapper", async () => {
    mockRoute("get", "/domains/report", { success: true, report: {} });
    const report = await DomainClientService.getReport();
    expect(report.snapshot.totalDomains).toBe(0);
    expect(report.sslExpiry).toEqual([]);
  });
});
