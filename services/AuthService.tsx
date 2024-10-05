'use client';
import AxiosInstance from "@/libs/axios";
import OTP from "@/types/OTP";
import User from "@/types/User";

export class AuthService {
    static changeLanguage(newLanguage: string) {
        throw new Error('Method not implemented.');
    }
    static changeName(newName: string) {
        throw new Error('Method not implemented.');
    }
    static changePhone(newPhone: string) {
        throw new Error('Method not implemented.');
    }


    static AxiosInstance: any = AxiosInstance;

    static ZustandStore: any;
    static SecureStore: any;

    
    static initialize(ZustandStore: any, SecureStore: any) {
        this.ZustandStore = ZustandStore;
        this.SecureStore = SecureStore;

        this.loadFromSecureStore();

    }

    static async loadFromSecureStore() {

        if (!this.SecureStore || !this.ZustandStore) {
            return;
        }

        await this.SecureStore.getItemAsync('token').then((token : string | null) => {
            if (token) {
                this.ZustandStore?.useAuthStore.setState({ token });
                
                this.AxiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + token;
            }
        });

        await this.SecureStore.getItemAsync('user').then((user : string | null) => {
            if (user) {
                this.ZustandStore?.useAuthStore.setState({ user: JSON.parse(user) });
            }
        });

        await this.SecureStore.getItemAsync('otp').then((otp : string | null) => {
            if (otp) {
                this.ZustandStore?.useAuthStore.setState({ otp: JSON.parse(otp) });
            }
        });


        console.log("AuthService loaded from secure store");
        console.log(this.ZustandStore.useAuthStore.getState().token);
    }

    static async saveToSecureStore() {

        if (!this.SecureStore || !this.ZustandStore) {
            return;
        }

        this.SecureStore.setItemAsync('token', this.ZustandStore.useAuthStore.getState().token);
        this.SecureStore.setItemAsync('user', JSON.stringify(this.ZustandStore.useAuthStore.getState().user));
        this.SecureStore.setItemAsync('otp', JSON.stringify(this.ZustandStore.useAuthStore.getState().otp));
    }


    static async wait(seconds: number) {
        return new Promise((resolve) => {
            setTimeout(() => {

            }, seconds * 1000);
        });
    }

   
    static async login(email: string, password: string): Promise<any> {
        const response = await this.AxiosInstance.post('/v1/auth/login', { email, password })

        if (response.data) {
            this.ZustandStore.useAuthStore.setState({ token: response.data.token, user: response.data.user, otp: response.data.OTP });
            console.log("Login successful");
            await this.saveToSecureStore();
        }

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

    static async changeEmail(email: string): Promise<any> {
        const response = await this.AxiosInstance.post('/v1/auth/change-email', { email }).catch((error: any) => {
            return null;
        });
        return response.data;
    }
    
}

