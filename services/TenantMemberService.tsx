'use client';
import OTP from "@/types/OTP";
import User from "@/types/User";
import { AuthService } from "./AuthService";

import Tenant from "@/types/Tenant";
import TenantMember from "@/types/TenantMember";

export class TenantMemberService {


    static AxiosInstance = AuthService.AxiosInstance;
    static ZustandStore: any;
    static SecureStore: any;

    static initialize(ZustandStore: any, SecureStore: any) {
        console.log("TenantMemberService initialized");
        this.ZustandStore = ZustandStore;
        this.SecureStore = SecureStore;

        this.loadFromSecureStore();
    }

    static async loadFromSecureStore() {

        if (!this.SecureStore || !this.ZustandStore) {
            return;
        }

        await this.SecureStore.getItemAsync('selectedTenantMembership').then((selectedTenantMembership: string | null) => {
            if (selectedTenantMembership) {
                this.ZustandStore?.useTenantMemberStore.setState({ selectedTenantMembership: JSON.parse(selectedTenantMembership) });
            }
        });

        console.log("TenantMemberService loaded from secure store");

    }


    static async getTenantMembershipsByUser(): Promise<TenantMember[] | null> {

        const response = await this.AxiosInstance.get('/v1/tenants/me').catch((error: any) => {
            return null;
        });

        const memberships = response.data.memberships;

        return memberships.map((membership: any) => {
            return {
                tenantMemberId: membership.tenantMemberId,
                tenantId: membership.tenantId,
                userId: membership.userId,
                roles: membership.roles,
                createdAt: new Date(membership.createdAt),
                updatedAt: new Date(membership.updatedAt),
                status: membership.status,
                tenant: {
                    tenantId: membership.tenant.tenantId,
                    name: membership.tenant.name,
                    domain: membership.tenant.domain,
                    logo: membership.tenant.logo,
                    favicon: membership.tenant.favicon,
                    theme: membership.tenant.theme,
                } as Tenant
            } as TenantMember;
        });

    }

    static async setSelectTenantMembership(tenantMember: TenantMember) {
        console.log("useTenantMemberStore", this.ZustandStore?.useTenantMemberStore);
        this.ZustandStore?.useTenantMemberStore.setState({ selectedTenantMembership: tenantMember });
        this.SecureStore.useTenantMemberStore.setItemAsync('selectedTenantMembership', JSON.stringify(tenantMember));
    }

    static async getSelectedTenantMembership(): Promise<TenantMember | null> {
        return this.ZustandStore?.useTenantMemberStore.getState().selectedTenantMembership;
    }
    


}