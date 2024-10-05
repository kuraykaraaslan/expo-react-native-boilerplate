import { create } from "zustand";
import TenantMember from "@/types/TenantMember";
import Tenant from "@/types/Tenant";

type State = {
    selectedTenantMembership: TenantMember | null;
    tenantMemberships: TenantMember[];
    setTenantMemberships: (tenantMemberships: TenantMember[]) => void;
    setSelectedTenantMembership: (tenantMembership: TenantMember) => void;
};

const useTenantMemberStore = create<State>((set) => ({
    selectedTenantMembership: null,
    tenantMemberships: [],
    setTenantMemberships: (tenantMemberships) => set({ tenantMemberships }),
    setSelectedTenantMembership: (tenantMembership) => set({ selectedTenantMembership: tenantMembership }),
}));

export default useTenantMemberStore;