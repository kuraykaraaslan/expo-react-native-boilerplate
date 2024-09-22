'use client';
import AxiosInstance from "@/libs/axios";
import User from "@/types/User";
import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders, AxiosAdapter } from 'axios';

export class AuthService {

    static AxiosInstance: any = AxiosInstance;
    static router: any | null = null;

    static token: string | null = null;
    static user: User | null = null;
    static toast: any;

    static OTPCanUseEmail: boolean = false;
    static OTPCanUsePhone: boolean = false;

    static sessionStorage: any;

    static async wait(seconds: number) {
        return new Promise((resolve) => {
            setTimeout(() => {

            }, seconds * 1000);
        });
    }

    constructor(toast?: any, router?: any) {
        AuthService.router = router;
        AuthService.toast = toast;

        AuthService.initialize(); 

    }

    checkRouter() {
        if (!AuthService.router) {
            return false;
        }
        return true;
    }

    setToast(toast: any) {
        toast = toast;
    }

    setRouter(router: any) {
        AuthService.router = router;
    }

    getUser() {
        console.log("User: ", AuthService.user);
        return AuthService.user;
    }

    getToken() {
        return AuthService.token;
    }

    static async initialize() {
        console.log("AuthService initialized");
        if (AuthService.token) {
            const user = await AuthService.fetchUser();

            if (!user) {
                AuthService.router?.push('/auth/login');
            } 


        }
    }

    static async register(email: string, password: string, confirmPassword: string): Promise<any> {


        try {

            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

            if (!emailRegex.test(email)) {
                throw new Error("INVALID_EMAIL")
            }

            // min six non-space characters, at least one uppercase, one lowercase, and one number
            const passwordRegex = /^(?=.*[a-zçğıöşü])(?=.*[A-ZÇĞİÖŞÜ])(?=.*\d)(?=.*[@$!%*?&])[A-Za-zçğıöşüÖÇŞİĞÜ0-9@$!%*?&]{8,50}$/;

            if (!passwordRegex.test(password)) {
                throw new Error("INVALID_PASSWORD")
            }

            if (password !== confirmPassword) {
                throw new Error("PASSWORDS_DO_NOT_MATCH")
            }

        } catch (error: any) {
            AuthService.toast?.error(error.message);
            return error;
        }

        const response = await AuthService.AxiosInstance.post('/auth/register', { email, password }).then((response: any) => {

            AuthService.toast?.success(response.data.message);
            AuthService.toast?.success("PLEASE_VERIFY_EMAIL");
            AuthService.router?.push('/auth/verify?email=' + email);
            return response.data;
        }
        ).catch((error: any) => {
            AuthService.toast?.error("SOMETHING_WENT_WRONG");
            return error.response.message;
        });

        return response;
    }


    static async login(email: string, password: string): Promise<any> {

        try {

            if (!email || !password) {
                throw new Error("INVALID_CREDENTIALS")
            }

        }

        catch (error: any) {

            AuthService.toast?.error(error.message);
            return error;
        }

        const response = await AuthService.AxiosInstance.post('/v1/auth/login', { email, password }).then((response: any) => {

            //check router
            console.log("Router: ", AuthService.router);

            AuthService.token = response.data.token;
            AuthService.user = response.data.user;
            


            const OTP = response.data.OTP;

            console.log("OTP: ", OTP);

            if (!OTP) {
                throw new Error("SOMETHING_WENT_WRONG");
            }

            if (OTP.OTPNeeded) {
                AuthService?.router?.push('/auth/2fa');
                AuthService.OTPCanUseEmail = OTP.OTPCanUseEmail;
                AuthService.OTPCanUsePhone = OTP.OTPCanUsePhone;
                return "OTP_NEEDED";
            } else {
                AuthService.router?.push('/dashboard');
            }


            return true;
        }
        ).catch((error: any) => {
            AuthService.toast?.error("SOMETHING_WENT_WRONG");
            console.log(JSON.stringify(error));
            return error;
        });

        return response;
    }

    static async logout(token?: string) {


        try {
            const response = await AuthService.AxiosInstance.post('/v1/auth/logout');
        } catch (error) {
            console.error(error);
        }

        AuthService.token = null;
        AuthService.user = null;

        AuthService.toast?.success("LOGOUT_SUCCESS");

        try {
            AuthService.router?.push('/auth/login');
        } catch (error) {
            AuthService.toast?.error("ROUTER_NOT_AVAILABLE");
        }
    }

    static async verify(email: string, code: string): Promise<any> {

        try {
            if (!email || !code) {
                throw new Error("INVALID_CREDENTIALS")
            }

            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

            if (!emailRegex.test(email)) {
                throw new Error("INVALID_EMAIL")
            }

            const codeRegex = /^[0-9]{6}$/;

            if (!codeRegex.test(code)) {
                throw new Error("INVALID_CODE")
            }

        } catch (error: any) {
            AuthService.toast?.error(error.message);
            return error;
        }

        const response = await AuthService.AxiosInstance.post('/v1/auth/verify', { email, code }).then((response: any) => {
            AuthService.toast?.success(response.data.message);
            AuthService.router?.push('/auth/login');
            return response.data;
        }
        ).catch((error: any) => {
            AuthService.toast?.error("SOMETHING_WENT_WRONG");
            return error.response.message;
        });

        return response;
    }

    static async verifyEmailOTP(code: string): Promise<any> {

        try {
            if (!code) {
                throw new Error("INVALID_CODE")
            }

            const codeRegex = /^[0-9]{6}$/;

            if (!codeRegex.test(code)) {
                throw new Error("INVALID_CODE")
            }

        } catch (error: any) {
            AuthService.toast?.error(error.message);
            return error;
        }

        const token = AuthService.token;

        const response = await AuthService.AxiosInstance.post('/v1/auth/otp/email-verify', { token , code }).then((response: any) => {
            AuthService.toast?.success(response.data.message);
            AuthService.router?.push('/dashboard');
            return response.data;
        }
        ).catch((error: any) => {
            AuthService.toast?.error("SOMETHING_WENT_WRONG");
            return error.response.message;
        });

        return response;
    }

    static async verifyPhoneOTP(code: string): Promise<any> {
            
            try {
                if (!code) {
                    throw new Error("INVALID_CODE")
                }
    
                const codeRegex = /^[0-9]{6}$/;
    
                if (!codeRegex.test(code)) {
                    throw new Error("INVALID_CODE")
                }
    
            } catch (error: any) {
                AuthService.toast?.error(error.message);
                return error;
            }
    
            const token = AuthService.token;
    
            const response = await AuthService.AxiosInstance.post('/v1/auth/otp/phone-verify', { token , code }).then((response: any) => {
                AuthService.toast?.success(response.data.message);
                AuthService.router?.push('/dashboard');
                return response.data;
            }
            ).catch((error: any) => {
                AuthService.toast?.error("SOMETHING_WENT_WRONG");
                return error.response.message;
            });
    
            return response;
    }



    static async sendEmailOTP(): Promise<any> {
        const token = AuthService.token;

        const response = await AuthService.AxiosInstance.post('/v1/auth/otp/email-send', { token }).then((response: any) => {
            AuthService.toast?.success(response.data.message);
            return response.data;
        }
        ).catch((error: any) => {
            AuthService.toast?.error("SOMETHING_WENT_WRONG");
            return error.response.message;
        });

        return response;
    }

    static async sendPhoneOTP(): Promise<any> {
        const token = AuthService.token;

        const response = await AuthService.AxiosInstance.post('/v1/auth/otp/sms-send', { token }).then((response: any) => {
            AuthService.toast?.success(response.data.message);
            return response.data;
        }
        ).catch((error: any) => {
            AuthService.toast?.error("SOMETHING_WENT_WRONG");
            return error.response.message;
        });

        return response;

    }

    static async resendVerification(email: string): Promise<any> {

        try {
            if (!email) {
                throw new Error("INVALID_EMAIL")
            }

            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

            if (!emailRegex.test(email)) {
                throw new Error("INVALID_EMAIL")
            }

        } catch (error: any) {
            AuthService.toast?.error(error.message);
            return error;
        }

        const response = await AuthService.AxiosInstance.post('/v1/auth/resend-verification', { email }).then((response: any) => {
            AuthService.toast?.success(response.data.message);
            return response.data;
        }
        ).catch((error: any) => {
            AuthService.toast?.error("SOMETHING_WENT_WRONG");
            return error.response.message;
        });

        return response;
    }

    static async fetchUser(): Promise<any> {
        const response = await AuthService.AxiosInstance.get('/v1/users/me',
            {
                headers: {
                    authorization: `Bearer ${AuthService.token}`
                }
            }
        ).then((response: any) => {
            //AuthService.toast?.success("USER_FETCHED");
            AuthService.user = response.data;
            console.log("User: ", AuthService.user);
            return true;
        }).catch((error: any) => {

            AuthService.toast?.error(error?.response?.data?.message || "SOMETHING_WENT_WRONG");

            if (AuthService.router !== null && error.response.status === 401) {
                AuthService.router.push('/auth/login');
            }

            return false;
        }
        );

        return response;
    }

    static async fetchUserTenants(): Promise<any> {
        const response = await AuthService.AxiosInstance.get('/v1/users/me/memberships',
            { 
                page: 1,
                limit: 10
            },
            {
                headers: {
                    authorization: `Bearer ${AuthService.token}`
                }
            }
        ).then((response: any) => {
            AuthService.toast?.success("TENANTS_FETCHED");
            return response.data;
        }).catch((error: any) => {
            AuthService.toast?.error("SOMETHING_WENT_WRONG");
            return error.response.message;
        }
        );

        return response;
    }

    static async ssoCallback(token: string): Promise<any> {

        AuthService.token = token;
        sessionStorage.setItem('token', token);
        await AuthService.fetchUser();
        AuthService.router?.push('/dashboard');
    }

    static async ssoLogin(provider: string) {
        switch (provider) {
            case "google":
                AuthService.loginWithGoogle();
                break;
            case "github":
                AuthService.loginWithGithub();
                break;
            case "apple":
                AuthService.loginWithApple();
                break;
            case "twitter":
                AuthService.loginWithTwitter();
                break;
            default:
                AuthService.toast?.error("INVALID_PROVIDER");
                break;
        }

    }


    static async loginWithGithub() {

        const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
        const GITHUB_CALLBACK_URL = process.env.NEXT_PUBLIC_GITHUB_CALLBACK_URL;

        // https://github.com/login/oauth/authorize?client_id=${client_id}&response_type=code&scope=repo&redirect_uri=${window.location.origin}/integrations/github/oauth2/callback&state=${state}

        const url = "https://github.com/login/oauth/authorize?client_id=" + CLIENT_ID + "&response_type=code&scope=repo&redirect_uri=" + GITHUB_CALLBACK_URL + "&scope=read:user,user:email&state=" + Math.random().toString(36).substring(7);

        this.router?.push(url);

        console.log("router: ", this.router);

        console.log("URL: ", url);

    }

    static async loginWithGoogle() {

        const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const GOOGLE_CALLBACK_URL = process.env.NEXT_PUBLIC_GOOGLE_CALLBACK_URL;
        const randomState = Math.random().toString(36).substring(7);

        const url = "https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/cloud-platform&response_type=code&access_type=offline&state=" + randomState + "&redirect_uri=" + GOOGLE_CALLBACK_URL + "&client_id=" + CLIENT_ID + "&prompt=consent" + "&include_granted_scopes=true";

        this.router?.push(url);

    }

    static async loginWithApple() {
        AuthService.toast?.error("NOT_IMPLEMENTED_YET");
    }

    static async loginWithTwitter() {
        AuthService.toast?.error("NOT_IMPLEMENTED_YET");
    }

    static async loginWithFacebook() {
        AuthService.toast?.error("NOT_IMPLEMENTED_YET");
    }


}