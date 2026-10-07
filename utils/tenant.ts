import type { TenantMembership } from "@/services/tenant/tenant.dto";

/** Selectable only when both the membership and the organization itself are active. */
export function isSelectable(m: Pick<TenantMembership, "memberStatus" | "tenant">): boolean {
  return m.memberStatus === "ACTIVE" && m.tenant.tenantStatus === "ACTIVE";
}

/** Which status explains why an organization can't be opened: the membership first, then the organization. */
export function unavailableReason(m: Pick<TenantMembership, "memberStatus" | "tenant">): { kind: "membership" | "tenant"; status: string } | null {
  if (m.memberStatus !== "ACTIVE") return { kind: "membership", status: m.memberStatus };
  if (m.tenant.tenantStatus !== "ACTIVE") return { kind: "tenant", status: m.tenant.tenantStatus };
  return null;
}
