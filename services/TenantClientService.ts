import axiosInstance from "@/libs/axios";
import { MyTenantsResponse, MyTenantsResponseSchema } from "@/dto/tenant.dto";

export class TenantClientService {
  static async getMyTenants(): Promise<MyTenantsResponse> {
    const res = await axiosInstance.get("/api/system/auth/me/tenants");
    return MyTenantsResponseSchema.parse(res.data);
  }
}
