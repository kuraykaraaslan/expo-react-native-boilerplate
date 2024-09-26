'use client';
import AxiosInstance from "@/libs/axios";
import User from "@/types/User";

import { useAuthStore } from "@/libs/zustand";

export class AuthService {

    static AxiosInstance: any = AxiosInstance;

    static store: any = useAuthStore();


    static async wait(seconds: number) {
        return new Promise((resolve) => {
            setTimeout(() => {

            }, seconds * 1000);
        });
    }

   
    static async login(email: string, password: string): Promise<any> {
        const response = await this.AxiosInstance.post('/v1/auth/login', { email, password }).catch((error: any) => {
            return null;
        });

        return response.data;   
    }

    static async register(email: string, password: string): Promise<any> {
        const response = await this.AxiosInstance.post('/v1/auth/register', { email, password }).catch((error: any) => {
            return null;
        });

        return response.data;   
    }

    static async sendEmailOTP(token: string): Promise<any> {
        const response = await this.AxiosInstance.post('/v1/auth/otp/email-send', { token: token }).catch((error: any) => {
            return null;
        });
        return response.data;   
    }

    static async sendPhoneOTP(token: string): Promise<any> {
        const response = await this.AxiosInstance.post('/v1/auth/otp/phone-send', { token: token }).catch((error: any) => {
            return null;
        });
        return response.data;
    }

    static async verifyEmailOTP(token: string, code: string): Promise<any> {
        const response = await this.AxiosInstance.post('/v1/auth/otp/email-verify', { token: token, code }).catch((error: any) => {
            return null;
        });
        return response.data;
    }

    static async verifyPhoneOTP(token: string, code: string): Promise<any> {
        const response = await this.AxiosInstance.post('/v1/auth/otp/phone-verify', { token: token, code }).catch((error: any) => {
            return null;
        });
        return response.data;
    }
}

