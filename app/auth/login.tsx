// Login Page

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking } from 'react-native';
import { Link } from "expo-router";
import Logo from '@/components/Logo';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faApple, faFacebook, faFacebookF, faGoogle } from '@fortawesome/free-brands-svg-icons';
import AuthLayout from '@/components/Layouts/AuthLayout';

import axios from "@/libs/http/axios";
import i18n from '@/libs/localize/localize';


export default function Login() {

    const { t } = i18n;

    function handleLogin() {
        console.log("Login");
        axios.get('https://mock.httpstatus.io/403').then((response: any) => {
            console.log(response);
        }
        ).catch((error) => {
            console.log("Error", error);
        });

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
            <TextInput className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200" placeholder={t('AUTH.EMAIL')} />
            <TextInput className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200" placeholder={t('AUTH.PASSWORD')} />
            <TouchableOpacity onPress={handleLogin} className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">{t('AUTH.LOGIN')}</Text>
            </TouchableOpacity>
        </AuthLayout>
    );
}