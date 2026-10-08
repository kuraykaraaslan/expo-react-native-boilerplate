import { ComplianceClientService } from "@/services/compliance/compliance.service.client";
import { USER_ID } from "./fixtures";
import { mockRoute } from "./_helpers";

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

  it("reads the state for the given user (a purpose never answered is absent)", async () => {
    const seen = mockRoute("get", "/consent", { state: { analytics: true } });
    expect(await ComplianceClientService.getConsentState(USER_ID)).toEqual({ analytics: true });
    expect(seen[0].query).toEqual({ userId: USER_ID });
  });

  it("records a batch of decisions with the user's own id", async () => {
    const seen = mockRoute("post", "/consent", () => ({ body: { records: [] }, init: { status: 201 } }));
    await ComplianceClientService.recordConsent({
      userId: USER_ID,
      policyVersion: "v2",
      decisions: [{ purpose: "analytics", granted: false }, { purpose: "marketing", granted: true }],
    });
    expect(seen[0].body).toEqual({
      userId: USER_ID,
      policyVersion: "v2",
      decisions: [{ purpose: "analytics", granted: false }, { purpose: "marketing", granted: true }],
    });
  });

  it("refuses a record without a user id or decisions before sending", async () => {
    const seen = mockRoute("post", "/consent", { records: [] });
    // @ts-expect-error missing userId
    await expect(ComplianceClientService.recordConsent({ decisions: [{ purpose: "analytics", granted: true }] })).rejects.toBeDefined();
    await expect(ComplianceClientService.recordConsent({ userId: USER_ID, decisions: [] })).rejects.toBeDefined();
    expect(seen).toHaveLength(0);
  });
});

describe("audit log", () => {
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
