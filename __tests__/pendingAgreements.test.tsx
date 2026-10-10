import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { PendingAgreementsBanner } from "@/components/compliance/PendingAgreementsBanner";
import { applyCompliance, clearPendingAgreements, refreshPendingAgreements } from "@/libs/pendingAgreements";
import { logout } from "@/libs/logout";
import AgreementScreen from "@/app/(drawer)/settings/agreement";
import { useAuthStore } from "@/stores/authStore";
import { useComplianceStore } from "@/stores/complianceStore";
import { useTenantStore } from "@/stores/tenantStore";
import { OTHER_TENANT_ID, TENANT_ID, sessionJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({ type: "terms_of_use" })),
}));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
  ImpactFeedbackStyle: { Light: "light" },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@fortawesome/react-native-fontawesome", () => ({ FontAwesomeIcon: () => null }));

const AGREEMENT_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000e1";
const VERSION_ID = "6f1c2a3b-4d5e-4f60-8a7b-0000000000e2";
const pendingItem = { agreementId: AGREEMENT_ID, type: "terms_of_use", key: "terms", title: "Terms of use", versionId: VERSION_ID, version: 3, contentHash: "h" };
const section = { pendingAgreements: [pendingItem] };
const doc = {
  agreement: { agreementId: AGREEMENT_ID, type: "terms_of_use", key: "terms", title: "Terms of use", description: null, requiresAcceptance: true, isActive: true },
  version: { versionId: VERSION_ID, agreementId: AGREEMENT_ID, version: 3, content: "<script>alert(1)</script> You agree.", contentHash: "h", language: "en", publishedAt: "2026-10-02T00:00:00.000Z" },
};

beforeEach(async () => {
  jest.clearAllMocks();
  await signIn();
  useComplianceStore.getState().clear();
});

describe("pending agreements flag", () => {
  it("applyCompliance stores the flag per tenant; an absent section means nothing is pending", () => {
    applyCompliance(TENANT_ID, { pendingAgreements: [pendingItem] });
    expect(useComplianceStore.getState()).toMatchObject({ tenantId: TENANT_ID });
    expect(useComplianceStore.getState().pending).toHaveLength(1);
    applyCompliance(TENANT_ID, undefined);
    expect(useComplianceStore.getState().pending).toEqual([]);
  });

  it("refresh re-reads GET /auth/session for the active organization", async () => {
    mockRoute("get", "/auth/session", { ...sessionJson, compliance: section });
    await refreshPendingAgreements();
    expect(useComplianceStore.getState().pending).toHaveLength(1);
  });

  it("refresh drops a late answer after an organization switch", async () => {
    mockRoute("get", "/auth/session", () => {
      useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID });
      return { body: { ...sessionJson, compliance: section } };
    });
    await refreshPendingAgreements();
    expect(useComplianceStore.getState().pending).toEqual([]);
  });

  it("refresh drops a late answer after a sign-out", async () => {
    mockRoute("get", "/auth/session", () => {
      useAuthStore.setState({ isAuthenticated: false });
      return { body: { ...sessionJson, compliance: section } };
    });
    await refreshPendingAgreements();
    expect(useComplianceStore.getState().pending).toEqual([]);
  });

  it("clearPendingAgreements invalidates a refresh in flight", async () => {
    mockRoute("get", "/auth/session", () => {
      clearPendingAgreements();
      return { body: { ...sessionJson, compliance: section } };
    });
    await refreshPendingAgreements();
    expect(useComplianceStore.getState().pending).toEqual([]);
  });

  it("a failed refresh keeps the previous flag", async () => {
    applyCompliance(TENANT_ID, section);
    mockRoute("get", "/auth/session", () => fail(500, { message: "boom" }));
    await refreshPendingAgreements();
    expect(useComplianceStore.getState().pending).toHaveLength(1);
  });

  it("logout clears the flag", async () => {
    applyCompliance(TENANT_ID, section);
    mockRoute("delete", "/auth/me/sessions/:id", {});
    await logout();
    expect(useComplianceStore.getState()).toMatchObject({ tenantId: null, pending: [] });
  });
});

describe("PendingAgreementsBanner", () => {
  it("renders nothing when nothing is pending", async () => {
    await render(<PendingAgreementsBanner />);
    expect(screen.queryByTestId("pending-agreements-banner")).toBeNull();
  });

  it("ignores a flag that was read for another organization", async () => {
    applyCompliance(OTHER_TENANT_ID, section);
    await render(<PendingAgreementsBanner />);
    expect(screen.queryByTestId("pending-agreements-banner")).toBeNull();
  });

  it("opens the reader for a single pending agreement", async () => {
    applyCompliance(TENANT_ID, section);
    await render(<PendingAgreementsBanner />);
    await fireEvent.press(screen.getByText("Review"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/settings/agreement", params: { type: "terms_of_use" } });
  });

  it("opens the legal screen when several are pending", async () => {
    applyCompliance(TENANT_ID, { pendingAgreements: [pendingItem, { ...pendingItem, agreementId: "a2", type: "privacy_policy" }] });
    await render(<PendingAgreementsBanner />);
    await fireEvent.press(screen.getByText("Review"));
    expect(router.push).toHaveBeenCalledWith("/settings/legal");
  });
});

describe("AgreementScreen", () => {
  it("shows the text as plain text and accepts without a userId", async () => {
    applyCompliance(TENANT_ID, section);
    mockRoute("get", "/agreements/current", doc);
    mockRoute("get", "/auth/session", { ...sessionJson, compliance: { pendingAgreements: [] } });
    const accept = mockRoute("post", "/agreements/accept", () => ({ body: { acceptance: { versionId: VERSION_ID, accepted: true } }, init: { status: 201 } }));

    await render(<AgreementScreen />);
    await waitFor(() => expect(screen.getByTestId("agreement-content")).toBeTruthy());
    expect(screen.getByTestId("agreement-content").props.children).toBe("<script>alert(1)</script> You agree.");

    await fireEvent.press(screen.getByTestId("agreement-accept"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(accept[0].body).toEqual({ agreementId: AGREEMENT_ID, accepted: true });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
    expect(useComplianceStore.getState().pending).toEqual([]);
    expect(router.back).toHaveBeenCalled();
  });

  it("shows no accept button when nothing is pending for it", async () => {
    mockRoute("get", "/agreements/current", doc);
    await render(<AgreementScreen />);
    await waitFor(() => expect(screen.getByTestId("agreement-content")).toBeTruthy());
    expect(screen.queryByTestId("agreement-accept")).toBeNull();
  });

  it("reloads and does not finish when the accepted version differs from the one shown", async () => {
    applyCompliance(TENANT_ID, section);
    const reads = mockRoute("get", "/agreements/current", doc);
    mockRoute("get", "/auth/session", { ...sessionJson, compliance: section });
    mockRoute("post", "/agreements/accept", () => ({ body: { acceptance: { versionId: "other-version", accepted: true } }, init: { status: 201 } }));

    await render(<AgreementScreen />);
    await waitFor(() => expect(screen.getByTestId("agreement-accept")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("agreement-accept"));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("This document changed while you were reading it. Please review the new version."));
    expect(reads.length).toBeGreaterThanOrEqual(2);
    expect(router.back).not.toHaveBeenCalled();
    expect(useComplianceStore.getState().pending).toHaveLength(1);
  });

  it("shows a note when the agreement is missing or unpublished", async () => {
    mockRoute("get", "/agreements/current", () => fail(409, { message: "NO_PUBLISHED_VERSION", code: "CONFLICT" }));
    await render(<AgreementScreen />);
    await waitFor(() => expect(screen.getByTestId("agreement-unavailable")).toBeTruthy());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("drops an answer that arrives after an organization switch", async () => {
    // First answer arrives after the switch; the reload for the new organization finds nothing published.
    mockRoute("get", "/agreements/current", (call: number) => {
      if (call === 1) {
        useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID });
        return { body: doc };
      }
      return fail(404, { message: "AGREEMENT_NOT_FOUND", code: "NOT_FOUND" });
    });
    await render(<AgreementScreen />);
    await waitFor(() => expect(screen.getByTestId("agreement-unavailable")).toBeTruthy());
    expect(screen.queryByTestId("agreement-content")).toBeNull();
  });
});
