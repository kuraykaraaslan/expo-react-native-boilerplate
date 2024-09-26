import { create } from 'zustand'
import User from '@/types/User'
import OTP from '@/types/OTP'

type State = {
    token: string | null;
    user: User | null;
    otp: OTP | null;
    setUser: (user: User) => void;
    setToken: (token: string) => void;
    setOtp: (otp: OTP) => void;
    logout: () => void;
}

const useAuthStore = create<State>((set) => ({
    token: null,
    user: null,
    otp: null,
    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),
    setOtp: (otp) => set({ otp }),
    logout: () => set({ token: null, user: null , otp: null })
}))

export default useAuthStore;