import { Slot } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Link } from "expo-router";
import Logo from '@/components/Logo';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faApple, faFacebook, faFacebookF, faGoogle } from '@fortawesome/free-brands-svg-icons';

import { useRoute } from '@react-navigation/native';
//import { useFocusEffect } 
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import i18n from '@/libs/localize/localize';


export default function AuthLayout({ children , subChildren } : { children: React.ReactNode, subChildren: React.ReactNode }) {

    const { t } = i18n;

    function handleGoogleLogin() {
        console.log("Google login");
    }

    function handleFacebookLogin() {
        console.log("Facebook login");
    }

    function handleAppleLogin() {
        console.log("Apple login");
    }

    function handleGithubLogin() {
        console.log("Github login");
    }

    function handleLinkedInLogin() {
        console.log("LinkedIn login");
    }


    return (
        <View className="container mx-auto items-center justify-center bg-black h-screen">
            <Logo />
            <View className="flex justify-center px-4 w-full w-1/2 pt-8 shadow-lg rounded-lg">
                <View className="flex justify-center p-4 bg-white rounded-lg shadow-lg w-full border-2 border-gray-200">
                    {children}
                </View>
            </View>
            {/*Social Login*/}
            <View className="flex justify-center mt-6">
                <Text className="text-lg text-gray-500">{t('AUTH.OR_CONTINUE_WITH')}</Text>
            </View>
            <View className="flex justify-center px-4 w-full w-1/2 pt-8">
                <View className="flex flex-row justify-center w-full gap-4">
                    <View className="w-16 h-16 bg-white text-white text-center rounded-full items-center justify-center p-2 border-2 border-gray-200">
                        <TouchableOpacity onPress={handleGoogleLogin} className="w-full h-12 bg-red-500 text-white text-center rounded-lg mt-4 p-2">
                            <FontAwesomeIcon icon={faGoogle} size={30} color="black" />
                        </TouchableOpacity>
                    </View>
                    <View className="w-16 h-16 bg-white text-white text-center rounded-full items-center justify-center p-2 border-2 border-gray-200">
                        <TouchableOpacity onPress={handleFacebookLogin} className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">
                            <FontAwesomeIcon icon={faFacebookF} size={30} color="black" />
                        </TouchableOpacity>
                    </View>
                    <View className="w-16 h-16 bg-white text-white text-center rounded-full items-center justify-center p-2 border-2 border-gray-200">
                        <TouchableOpacity onPress={handleAppleLogin} className="w-full h-12 bg-black text-white text-center rounded-lg mt-4 p-2">
                            <FontAwesomeIcon icon={faApple} size={30} color="black" />
                        </TouchableOpacity>
                    </View>
                    <View className="w-16 h-16 bg-white text-white text-center rounded-full items-center justify-center p-2 border-2 border-gray-200">
                        <TouchableOpacity onPress={handleGithubLogin} className="w-full h-12 bg-black text-white text-center rounded-lg mt-4 p-2">
                            <FontAwesomeIcon icon={faFacebook} size={30} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <View className="absolute bottom-20 w-full p-4 items-center justify-center">
                {subChildren}
            </View>
        </View>
    );
}
