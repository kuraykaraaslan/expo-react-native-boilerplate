import TenantMember from "./TenantMember";

export default interface Tenant {
    tenantId: string;
    name: string;
    domain: string;
    logo?: string;
    favicon?: string;
    theme?: string;
    language?: string;
    timezone?: string;
    createdAt: Date;
    updatedAt: Date;
    members?: TenantMember[];
}
