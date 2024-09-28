import React, { useState } from 'react';
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

import { useNavigation } from '@react-navigation/native';

export default function LoginPage({ navigation }: any) {
    const { t } = i18n;

    // State hooks
    const [email, setEmail] = useState("kuraykaraaslan@gmail.com");
    const [password, setPassword] = useState("WeeBoo@123");
    
    const user = useAuthStore(state => state.user);
    const token = useAuthStore(state => state.token);
    const otp = useAuthStore(state => state.otp);

    //const navigation = useNavigation(); // React navigation hook

    // Handle login logic
    async function handleLogin() {
        console.log("Login");

        let result = null;

        try {
            result = await AuthService.login(email, password);
        } catch (error) {
            console.error("Error during login:", error);
        }

        if (result) {

            if (result.OTP?.OTPNeeded) {
                console.log("OTP needed");

                navigation.navigate("TFA"); // Navigate to OTP page
            } else {
                console.log("OTP not needed"); 
                //@ts-ignore
                navigation.navigate("Home"); // Navigate to Home page
            }
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