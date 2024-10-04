'use client';
import OTP from "@/types/OTP";
import User from "@/types/User";
import { AuthService } from "./AuthService";

import Tenant from "@/types/Tenant";
import TenantMember from "@/types/TenantMember";

export class TenantMemberService {

    static AxiosInstance = AuthService.AxiosInstance;
  
    static ZustandStore = AuthService.ZustandStore;
    static SecureStore = AuthService.SecureStore;

    static async getTenantMembershipsByUser() : Promise<TenantMember[] | null> {

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
                status: membership.status
            } as TenantMember;
        });
        
    }

}