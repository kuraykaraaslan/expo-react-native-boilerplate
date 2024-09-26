// Login Page

import React , { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking } from 'react-native';
import { Link } from "expo-router";
import Logo from '@/components/Logo';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faApple, faFacebook, faFacebookF, faGoogle } from '@fortawesome/free-brands-svg-icons';
import AuthLayout from '@/components/Layouts/AuthLayout';

import axios from "@/libs/axios";
import i18n from '@/libs/localize/localize';

import { AuthService } from '@/services/AuthService';
import { useAuthStore } from '@/libs/zustand';

export default function Login({ navigation } : any) {

    const { t } = i18n;

    const { setToken, setOtp , setUser } = useAuthStore();

    const [email, setEmail] = useState("kuraykaraaslan@gmail.com");
    const [password, setPassword] = useState("WeeBoo@123");

    async function handleLogin() {
        console.log("Login");

        const result = await AuthService.login(email, password)
            .then((res) => {
                setToken(res.token);
                setUser(res.user);
                setOtp(res.OTP);
                return res;
            });

        if (result) {
            setTimeout(() => {
                if (result.OTP.OTPNeeded) {
                    console.log("OTP needed");
                    navigation.navigate("TFA");
                } else {
                    console.log("OTP not needed");
                    navigation.navigate("index");
                }
            }, 2000);
        } else {
            console.log("Login failed");
        }
    }


    function subChildren() : React.ReactNode {
        return (
            <>
            <Link className="flex justify-center mt-6" href="/auth/register">
                <Text className="text-lg text-gray-500">{t('AUTH.NO_ACCOUNT')}</Text>
                <Text className="text-lg text-gray-100">&nbsp;</Text>
                <Text className="text-lg text-gray-100">{t('AUTH.REGISTER')}</Text>
            </Link>
            <Link className="flex justify-center mt-6" href="/auth/forgot-password">
                <Text className="text-lg text-gray-100">{t('AUTH.FORGOT_PASSWORD')}</Text>
            </Link>
            </>
        );
    }

    return (
        <AuthLayout subChildren={subChildren()}>
            
            <Text className="text-3xl font-bold">{t('AUTH.LOGIN')}</Text>
            <TextInput className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200 p-1 pl-2" placeholder={t('AUTH.EMAIL')} onChangeText={(text) => setEmail(text)} value={email}
            />
            <TextInput className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200 p-1 pl-2" placeholder={t('AUTH.PASSWORD')} onChangeText={(text) => setPassword(text)} value={password} secureTextEntry={true}
             />
            <TouchableOpacity onPress={handleLogin} className="w-full p-2">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">{t('AUTH.LOGIN')}</Text>
            </TouchableOpacity>
        </AuthLayout>
    );
}