import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { PendingInvitations } from "@/components/tenant/PendingInvitations";
import { TenantClientService } from "@/services/tenant/tenant.service.client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { meTenantsJson } from "./fixtures";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
  ImpactFeedbackStyle: { Light: "light" },
}));
jest.mock("@fortawesome/react-native-fontawesome", () => ({ FontAwesomeIcon: () => null }));
jest.mock("@/services/tenant/tenant.service.client");

const service = TenantClientService as jest.Mocked<typeof TenantClientService>;
const inv = meTenantsJson.invitations[0];
const invitation = { ...inv, memberRole: "ADMIN", tenant: { ...inv.tenant } } as never;
const overview = { tenants: [], delegatedTenants: [], invitations: [] };

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: true });
  useTenantStore.setState({ activeTenantId: "t1", pendingInvitations: [invitation] });
  service.getMyTenants.mockResolvedValue(overview);
});

describe("PendingInvitations", () => {
  it("renders nothing without invitations", async () => {
    useTenantStore.setState({ pendingInvitations: [] });
    await render(<PendingInvitations />);
    expect(screen.queryByTestId("pending-invitations")).toBeNull();
  });

  it("accepts, refreshes the list and offers a sign-in to the new organization", async () => {
    service.acceptInvitationById.mockResolvedValue({ tenantId: inv.tenantId, memberRole: "ADMIN" });
    await render(<PendingInvitations />);

    await fireEvent.press(screen.getByTestId(`pending-invitation-accept-${inv.invitationId}`));

    await waitFor(() => expect(screen.getByTestId(`pending-invitation-joined-${inv.invitationId}`)).toBeTruthy());
    expect(service.acceptInvitationById).toHaveBeenCalledWith(inv.tenantId, inv.invitationId, "t1");
    expect(service.getMyTenants).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
    expect(toast.success).toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId(`pending-invitation-signin-${inv.invitationId}`));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/tenant-login", params: { tenantId: inv.tenantId, name: inv.tenant.name } });
  });

  it("asks for confirmation before declining, and does nothing on cancel", async () => {
    await render(<PendingInvitations />);
    await fireEvent.press(screen.getByTestId(`pending-invitation-decline-${inv.invitationId}`));
    await fireEvent.press(screen.getByTestId("confirm-dialog-cancel"));
    expect(service.declineInvitationById).not.toHaveBeenCalled();
  });

  it("declines after confirmation", async () => {
    service.declineInvitationById.mockResolvedValue(undefined);
    await render(<PendingInvitations />);
    await fireEvent.press(screen.getByTestId(`pending-invitation-decline-${inv.invitationId}`));
    await fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(service.declineInvitationById).toHaveBeenCalledWith(inv.tenantId, inv.invitationId, "t1"));
    await waitFor(() => expect(useTenantStore.getState().pendingInvitations).toEqual([]));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("warning");
  });

  it("shows the email-not-verified message on a 403 and keeps the invitation", async () => {
    service.acceptInvitationById.mockRejectedValue({ response: { status: 403, data: { message: "Verify your email address" } } });
    await render(<PendingInvitations />);

    await fireEvent.press(screen.getByTestId(`pending-invitation-accept-${inv.invitationId}`));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
    expect(service.getMyTenants).not.toHaveBeenCalled();
    expect(screen.getByTestId(`pending-invitation-${inv.invitationId}`)).toBeTruthy();
  });

  it("re-reads the list after a 404 so the stale invitation disappears", async () => {
    service.acceptInvitationById.mockRejectedValue({ response: { status: 404, data: { message: "Invitation not found" } } });
    await render(<PendingInvitations />);

    await fireEvent.press(screen.getByTestId(`pending-invitation-accept-${inv.invitationId}`));

    await waitFor(() => expect(service.getMyTenants).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useTenantStore.getState().pendingInvitations).toEqual([]));
  });

  it("drops the 'joined' note when the organization changes", async () => {
    service.acceptInvitationById.mockResolvedValue({ tenantId: inv.tenantId, memberRole: "ADMIN" });
    await render(<PendingInvitations />);
    await fireEvent.press(screen.getByTestId(`pending-invitation-accept-${inv.invitationId}`));
    await waitFor(() => expect(screen.getByTestId(`pending-invitation-joined-${inv.invitationId}`)).toBeTruthy());

    await act(async () => useTenantStore.setState({ activeTenantId: "t2" }));
    expect(screen.queryByTestId(`pending-invitation-joined-${inv.invitationId}`)).toBeNull();
  });

  it("refreshes the overview on mount only when asked", async () => {
    await render(<PendingInvitations refreshOnMount />);
    await waitFor(() => expect(service.getMyTenants).toHaveBeenCalledTimes(1));
  });

  it("shows no toast for a refusal that arrives after an organization switch", async () => {
    let reject: (e: unknown) => void = () => {};
    service.acceptInvitationById.mockReturnValue(new Promise((_, r) => (reject = r)));
    await render(<PendingInvitations />);
    await fireEvent.press(screen.getByTestId(`pending-invitation-accept-${inv.invitationId}`));

    await act(async () => useTenantStore.setState({ activeTenantId: "t2" }));
    await act(async () => reject({ response: { status: 409, data: { message: "x" } } }));

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("maps a 410 to the expired message", async () => {
    service.acceptInvitationById.mockRejectedValue({ response: { status: 410, data: { message: "expired" } } });
    await render(<PendingInvitations />);
    await fireEvent.press(screen.getByTestId(`pending-invitation-accept-${inv.invitationId}`));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
  });
});
