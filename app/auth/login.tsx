// Login Page

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking } from 'react-native';
import { Link } from "expo-router";
import Logo from '@/components/Logo';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faApple, faFacebook, faFacebookF, faGoogle } from '@fortawesome/free-brands-svg-icons';
import AuthLayout from '@/components/Layouts/AuthLayout';


export default function Login() {

    function subChildren() : React.ReactNode {
        return (
            <>
            <Link className="flex justify-center mt-6" href="/auth/register">
                <Text className="text-lg text-gray-500">Don't have an account?</Text>
                <Text className="text-lg text-gray-100"> Register</Text>
            </Link>
            <Link className="flex justify-center mt-6" href="/auth/forgot-password">
                <Text className="text-lg text-gray-100">Forgot Password?</Text>
            </Link>
            </>
        );
    }

    return (
        <AuthLayout subChildren={subChildren()}>
            
            <Text className="text-3xl font-bold">Login</Text>
            <TextInput placeholder="Email" className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200" />
            <TextInput placeholder="Password" className="input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200" />
            <Link href="/auth/register" className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">Login</Link>
        </AuthLayout>
    );
}