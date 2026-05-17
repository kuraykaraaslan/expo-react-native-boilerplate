import { z } from "zod";
import axiosInstance from "@/libs/axios";
import {
  LoginRequest,
  LoginResponse,
  LoginResponseSchema,
  RegisterRequest,
  OTPMethod,
  SafeUser,
  SafeUserSchema,
  Session,
  SessionSchema,
  ChangeEmailRequest,
  ForgotPasswordRequest,
} from "@/dto/auth.dto";

export class AuthClientService {
  static async login(payload: LoginRequest): Promise<LoginResponse> {
    const res = await axiosInstance.post("/api/system/auth/login", payload);
    return LoginResponseSchema.parse(res.data);
  }

  static async logout(): Promise<void> {
    await axiosInstance.post("/api/system/auth/logout");
  }

  static async register(payload: RegisterRequest): Promise<void> {
    await axiosInstance.post("/api/system/auth/register", payload);
  }

  static async sendOTP(method: OTPMethod): Promise<void> {
    await axiosInstance.post("/api/system/auth/otp/send", { method });
  }

  static async verifyOTP(code: string, method: OTPMethod): Promise<SafeUser> {
    const res = await axiosInstance.post("/api/system/auth/otp/verify", { code, method });
    return SafeUserSchema.parse(res.data?.user);
  }

  static async forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
    await axiosInstance.post("/api/system/auth/forgot-password", payload);
  }

  static async getSession(): Promise<SafeUser> {
    const res = await axiosInstance.get("/api/system/auth/session");
    return SafeUserSchema.parse(res.data?.user);
  }

  static async getSessions(): Promise<Session[]> {
    const res = await axiosInstance.get("/api/system/auth/sessions");
    return z.array(SessionSchema).parse(res.data?.sessions ?? res.data ?? []);
  }

  static async revokeSession(sessionId: string): Promise<void> {
    await axiosInstance.delete(`/api/system/auth/sessions/${sessionId}`);
  }

  static async revokeAllSessions(): Promise<void> {
    await axiosInstance.delete("/api/system/auth/sessions");
  }

  static async changeEmail(payload: ChangeEmailRequest): Promise<void> {
    await axiosInstance.post("/api/system/auth/change-email", payload);
  }
}
