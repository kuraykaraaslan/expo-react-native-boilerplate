// Login Page

import React from 'react';
import { View, Text, Button, TextInput, TouchableOpacity } from 'react-native';
import { Link } from "expo-router";
import Logo from '@/components/Logo';
import AuthLayout from '@/components/Layouts/AuthLayout';
import i18n from '@/libs/localize/localize';

export default function RegisterPage() {

    const { t } = i18n;

    function handleRegister() {
        console.log("Register");
    }

    function subChildren() : React.ReactNode {
        return (
            <Link className="flex justify-center mt-6" href="/auth/login">
                <Text className="text-lg text-gray-500">{t('AUTH.HAVE_ACCOUNT')}</Text>
                <Text className="text-lg text-gray-100">&nbsp;</Text>
                <Text className="text-lg text-gray-100">{t('AUTH.LOGIN')}</Text>
            </Link>
        );
    }

    return (
        <AuthLayout subChildren={subChildren()}>
            
            <Text className="text-3xl font-bold">{t('AUTH.REGISTER')}</Text>
            <TextInput className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200" placeholder={t('AUTH.EMAIL')} />
            <TextInput className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200" placeholder={t('AUTH.PASSWORD')} />
            <TextInput className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200" placeholder={t('AUTH.CONFIRM_PASSWORD')} />
            <TouchableOpacity onPress={handleRegister} className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">{t('AUTH.REGISTER')}</Text>
            </TouchableOpacity>                
        </AuthLayout>
    );
}