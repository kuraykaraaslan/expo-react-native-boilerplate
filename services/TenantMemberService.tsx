'use client';
import OTP from "@/types/OTP";
import User from "@/types/User";
import { AuthService } from "./AuthService";
import AxiosInstance from "@/libs/axios";

import Tenant from "@/types/Tenant";
import TenantMember from "@/types/TenantMember";

export class TenantMemberService {


    static AxiosInstance = AxiosInstance;
    static ZustandStore: any;
    static SecureStore: any;
    static Toast: any;
    static Navigation: any;

    static initialize(ZustandStore: any, SecureStore: any , Toast: any) {
        console.log("TenantMemberService initialized");
        this.ZustandStore = ZustandStore;
        console.log("TenantMemberService ZustandStore", this.ZustandStore);
        this.SecureStore = SecureStore;
        this.Toast = Toast;

        this.loadFromSecureStore();
    }

    static async loadFromSecureStore() {

        if (!this.SecureStore || !this.ZustandStore) {
            return;
        }

        await this.SecureStore.getItemAsync('selectedTenantMembership').then((selectedTenantMembership: string | null) => {
            if (selectedTenantMembership) {
                console.log("selectedTenantMembership", selectedTenantMembership);
                this.ZustandStore?.useTenantMemberStore.setState({ selectedTenantMembership: JSON.parse(selectedTenantMembership) });
            }
        });

        console.log("TenantMemberService loaded from secure store");

    }

    static async flush() {
        this.ZustandStore?.useTenantMemberStore.setState({ selectedTenantMembership: null });
        this.SecureStore.deleteItemAsync('selectedTenantMembership');
    }


    static async getTenantMembershipsByUser(): Promise<TenantMember[] | null> {

        if (!this.AxiosInstance) {
            return null;
        }

        const response = await this.AxiosInstance.get('/v1/tenants/me').catch((error: any) => {
            return null;
        });

        if (!response) {
            this.Toast.show({
                type: 'error',
                text1: 'Failed to load memberships'
              });
            return null;
        }

        const memberships = response.data.memberships;

        this.Toast.show({
            type: 'success',
            text1: 'Memberships loaded'
          });

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
        this.SecureStore.setItemAsync('selectedTenantMembership', JSON.stringify(tenantMember));
        this.Toast.show({
            type: 'info',
            text1: 'Tenant membership selected'
            });
        console.log("Tenant membership selected");
    }

    static async getSelectedTenantMembership(): Promise<TenantMember | null> {
        return this.ZustandStore?.useTenantMemberStore.getState().selectedTenantMembership;
    }
    


}