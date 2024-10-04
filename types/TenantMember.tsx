/*
model TenantMember {

  tenantMemberId String @id @default(cuid())
  tenantId String
  userId String

  roles String[] @default(["USER"])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  status String @default("ACTIVE") // ENABLED, DISABLED

  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [tenantId])
  user User @relation(fields: [userId], references: [userId])

}
*/

import Tenant from "./Tenant";

export default interface TenantMember {
    tenantMemberId: string;
    tenantId: string;
    userId: string;
    roles: string[];
    createdAt: Date;
    updatedAt: Date;
    status: string;
    tenant?: Tenant;
}

