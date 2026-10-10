import { render, renderHook, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import InvitationLinkScreen from "@/app/invitation";
import { usePendingLinks } from "@/libs/usePendingLinks";
import { TenantClientService } from "@/services/tenant/tenant.service.client";
import { useAuthStore } from "@/stores/authStore";
import { usePendingLinkStore } from "@/stores/pendingLinkStore";
import { useTenantStore } from "@/stores/tenantStore";
import { meTenantsJson } from "./fixtures";

let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text testID="redirect">{href}</Text>;
  },
}));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
  ImpactFeedbackStyle: { Light: "light" },
}));
jest.mock("@fortawesome/react-native-fontawesome", () => ({ FontAwesomeIcon: () => null }));
jest.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => {
    const { Text, View } = jest.requireActual("react-native");
    return (
      <View>
        <Text testID="shell-title">{title}</Text>
        <Text testID="shell-subtitle">{subtitle}</Text>
        {children}
      </View>
    );
  },
}));
jest.mock("@/services/tenant/tenant.service.client");

const service = TenantClientService as jest.Mocked<typeof TenantClientService>;
const inv = meTenantsJson.invitations[0];
const invitation = { ...inv, memberRole: "ADMIN", tenant: { ...inv.tenant } } as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { action: "accept", tenantId: inv.tenantId };
  usePendingLinkStore.setState({ invitation: null });
  useAuthStore.setState({ isAuthenticated: true, otpRequired: false, mustChangePassword: false });
  useTenantStore.setState({ activeTenantId: "t1", pendingInvitations: [] });
  service.getMyTenants.mockResolvedValue({ tenants: [], delegatedTenants: [], invitations: [invitation] } as never);
});

describe("invitation link screen", () => {
  it("re-reads the account's invitations and lists them for the signed-in user", async () => {
    // refreshTenantOverview writes the server's list into the store
    service.getMyTenants.mockImplementation(async () => {
      const overview = { tenants: [], delegatedTenants: [], invitations: [invitation] } as never;
      return overview;
    });
    await render(<InvitationLinkScreen />);
    await waitFor(() => expect(service.getMyTenants).toHaveBeenCalled());
    expect(screen.getByTestId("shell-title")).toBeTruthy();
    expect(usePendingLinkStore.getState().invitation).toBeNull();
  });

  it("shows the empty state when the account has no invitation", async () => {
    service.getMyTenants.mockResolvedValue({ tenants: [], delegatedTenants: [], invitations: [] } as never);
    await render(<InvitationLinkScreen />);
    await waitFor(() => expect(screen.queryByText("No pending invitation")).toBeTruthy());
  });

  it("signed out: remembers the link (without any token) and sends the user to login", async () => {
    useAuthStore.setState({ isAuthenticated: false });
    await render(<InvitationLinkScreen />);
    expect(screen.getByTestId("redirect").props.children).toBe("/login");
    expect(usePendingLinkStore.getState().invitation).toEqual({ tenantId: inv.tenantId, action: "accept" });
    expect(service.getMyTenants).not.toHaveBeenCalled();
  });

  it("OTP pending: remembers the link and goes to /2fa", async () => {
    useAuthStore.setState({ otpRequired: true });
    await render(<InvitationLinkScreen />);
    expect(screen.getByTestId("redirect").props.children).toBe("/2fa");
    expect(usePendingLinkStore.getState().invitation).not.toBeNull();
  });
});

describe("usePendingLinks", () => {
  it("does nothing until the session is open, then forwards once", async () => {
    usePendingLinkStore.setState({ invitation: { tenantId: inv.tenantId, action: "decline" } });
    const { rerender } = await renderHook(({ open }: { open: boolean }) => usePendingLinks(open), { initialProps: { open: false } });
    expect(router.push).not.toHaveBeenCalled();

    await rerender({ open: true });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({ pathname: "/invitation", params: { action: "decline", tenantId: inv.tenantId } });
    expect(usePendingLinkStore.getState().invitation).toBeNull();

    await rerender({ open: true });
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
