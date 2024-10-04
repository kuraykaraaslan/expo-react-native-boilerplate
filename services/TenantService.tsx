'use client';
import OTP from "@/types/OTP";
import User from "@/types/User";
import { AuthService } from "./AuthService";

import Tenant from "@/types/Tenant";

export class TenantService {

    static AxiosInstance = AuthService.AxiosInstance;
  
    static ZustandStore = AuthService.ZustandStore;
    static SecureStore = AuthService.SecureStore;



}