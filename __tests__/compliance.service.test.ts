import { ComplianceClientService } from "@/services/compliance/compliance.service.client";
import { TENANT_ID, USER_ID } from "./fixtures";
import { mockRoute } from "./_helpers";

const AGREEMENT_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000e1";
const VERSION_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000e2";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

describe("consent", () => {
  it("reads the purposes and keeps `required` and an empty description as defaults", async () => {
    mockRoute("get", "/consent/config", {
      config: {
        enabled: true,
        policyVersion: "v2",
        bannerTitle: "Cookies",
        bannerMessage: "We use cookies",
        purposes: [
          { key: "necessary", label: "Necessary", description: "Needed to run the app", required: true },
          { key: "analytics", label: "Analytics" },
        ],
      },
    });
    const cfg = await ComplianceClientService.getConsentConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.purposes[0]).toMatchObject({ key: "necessary", required: true });
    expect(cfg.purposes[1]).toMatchObject({ key: "analytics", required: false, description: "" });
  });

  it("reads the state for the session user: the request carries no userId", async () => {
    const seen = mockRoute("get", "/consent", { state: { analytics: true } });
    expect(await ComplianceClientService.getConsentState()).toEqual({ analytics: true });
    expect(seen[0].query).toEqual({});
  });

  it("records a batch of decisions without a userId, even if a caller passes one", async () => {
    const seen = mockRoute("post", "/consent", () => ({ body: { records: [] }, init: { status: 201 } }));
    await ComplianceClientService.recordConsent({
      policyVersion: "v2",
      decisions: [{ purpose: "analytics", granted: false }, { purpose: "marketing", granted: true }],
      ...({ userId: USER_ID } as object),
    });
    expect(seen[0].body).toEqual({
      policyVersion: "v2",
      decisions: [{ purpose: "analytics", granted: false }, { purpose: "marketing", granted: true }],
    });
  });

  it("refuses a record without decisions before sending", async () => {
    const seen = mockRoute("post", "/consent", { records: [] });
    await expect(ComplianceClientService.recordConsent({ decisions: [] })).rejects.toBeDefined();
    expect(seen).toHaveLength(0);
  });
});

const agreementJson = {
  agreement: { agreementId: AGREEMENT_ID, tenantId: TENANT_ID, type: "terms_of_use", key: "terms", title: "Terms of use", description: null, requiresAcceptance: true, isActive: true, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" },
  version: { versionId: VERSION_ID, agreementId: AGREEMENT_ID, tenantId: TENANT_ID, version: 3, content: "<b>You agree</b>\nto everything.", contentHash: "abc", language: "en", status: "published", effectiveFrom: null, publishedAt: "2026-10-02T00:00:00.000Z", isCurrent: true, createdAt: "2026-10-02T00:00:00.000Z" },
};

describe("agreements", () => {
  it("lists the current agreements from { data } and keeps the text verbatim", async () => {
    const seen = mockRoute("get", "/agreements/current", { data: [agreementJson] });
    const list = await ComplianceClientService.getCurrentAgreements({ requiresAcceptance: true });
    expect(seen[0].query).toEqual({ requiresAcceptance: "true" });
    expect(list).toHaveLength(1);
    expect(list[0].version.content).toBe("<b>You agree</b>\nto everything."); // markup is data, never interpreted
    expect(list[0].version.version).toBe(3);
  });

  it("reads one agreement by type (a bare { agreement, version })", async () => {
    const seen = mockRoute("get", "/agreements/current", agreementJson);
    const doc = await ComplianceClientService.getCurrentAgreement("terms_of_use");
    expect(seen[0].query).toEqual({ type: "terms_of_use" });
    expect(doc.agreement.title).toBe("Terms of use");
  });

  it("accepts by agreement id with no userId or anonymousId in the body", async () => {
    const seen = mockRoute("post", "/agreements/accept", () => ({ body: { acceptance: { acceptanceId: "a1", versionId: VERSION_ID, accepted: true, subjectUserId: USER_ID } }, init: { status: 201 } }));
    const res = await ComplianceClientService.acceptAgreement({ agreementId: AGREEMENT_ID });
    expect(seen[0].body).toEqual({ agreementId: AGREEMENT_ID, accepted: true });
    expect(res.acceptance.versionId).toBe(VERSION_ID);
  });

  it("refuses an acceptance that names neither an agreement id nor a type", async () => {
    const seen = mockRoute("post", "/agreements/accept", { acceptance: {} });
    await expect(ComplianceClientService.acceptAgreement({})).rejects.toBeDefined();
    expect(seen).toHaveLength(0);
  });
});

describe("audit log", () => {
  it("passes the action, actor, resource type and date filters as query params", async () => {
    const seen = mockRoute("get", "/audit-logs", { logs: [], total: 0 });
    await ComplianceClientService.getAuditLogs({
      page: 1,
      pageSize: 20,
      action: "tenant.",
      actorId: USER_ID,
      resourceType: "tenant_domain",
      fromDate: "2026-10-01T00:00:00.000Z",
      toDate: "2026-10-10T23:59:59.999Z",
    });
    expect(seen[0].query).toEqual({
      page: "1",
      pageSize: "20",
      action: "tenant.",
      actorId: USER_ID,
      resourceType: "tenant_domain",
      fromDate: "2026-10-01T00:00:00.000Z",
      toDate: "2026-10-10T23:59:59.999Z",
    });
  });

  it("parses the list (page is 1-based) and passes the filters", async () => {
    const seen = mockRoute("get", "/audit-logs", {
      logs: [
        { auditLogId: "a1", actorId: USER_ID, actorType: "USER", action: "auth.login", severity: "low", resourceType: null, resourceId: null, metadata: { x: 1 }, ipAddress: "203.0.113.7", createdAt: "2026-10-06T10:00:00.000Z", prevHash: "h", rowHash: "h2" },
        { auditLogId: "a2", actorId: null, actorType: "SYSTEM", action: "tenant.updated", createdAt: "2026-10-06T11:00:00.000Z" },
      ],
      total: 41,
    });
    const res = await ComplianceClientService.getAuditLogs({ page: 2, pageSize: 20, severity: "high" });
    expect(seen[0].query).toEqual({ page: "2", pageSize: "20", severity: "high" });
    expect(res.total).toBe(41);
    expect(res.logs[0]).toMatchObject({ action: "auth.login", severity: "low", actorType: "USER" });
    expect(res.logs[1]).toMatchObject({ actorType: "SYSTEM", severity: "low" }); // severity defaults
  });
});
