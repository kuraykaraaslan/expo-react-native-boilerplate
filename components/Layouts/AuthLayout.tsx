import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Logo from '@/components/Logo';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faApple, faFacebookF, faGithub, faGoogle, faLinkedinIn } from '@fortawesome/free-brands-svg-icons';


import i18n from '@/libs/localize/localize';


export default function AuthLayout({ children, subChildren, hideSSO = false }: { children: React.ReactNode, subChildren: React.ReactNode, hideSSO?: boolean }) {

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
            <View className="flex justify-center px-4 w-full pt-8 shadow-lg rounded-lg">
                <View className="flex justify-center p-4 bg-white rounded-lg shadow-lg w-full border-2 border-gray-200">
                    {children}
                </View>
            </View>
            {/*Social Login*/}
            <View className={"flex justify-center mt-6" + (hideSSO ? " hidden" : "")}>
                <Text className="text-lg text-gray-500">{t('AUTH.OR_CONTINUE_WITH')}</Text>
            </View>
            <View className={"flex justify-center px-4 w-full w-1/2 pt-8" + (hideSSO ? " hidden" : "")}>
                <View className="flex flex-row justify-center w-full gap-4">
                    <TouchableOpacity onPress={handleGoogleLogin} className="w-16 h-16 bg-white items-center justify-center border-2 border-gray-200 text-red-500 text-center rounded-full self-center">
                        <FontAwesomeIcon icon={faGoogle} size={30} color="#DB4437" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleFacebookLogin} className="w-16 h-16 bg-white items-center justify-center border-2 border-gray-200 text-blue-500 text-center rounded-full self-center">
                        <FontAwesomeIcon icon={faFacebookF} size={30} color="#4267B2" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAppleLogin} className="w-16 h-16 bg-white items-center justify-center border-2 border-gray-200 text-black text-center rounded-full self-center">
                        <FontAwesomeIcon icon={faApple} size={30} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleGithubLogin} className="w-16 h-16 bg-white items-center justify-center border-2 border-gray-200 text-black text-center rounded-full self-center">
                        <FontAwesomeIcon icon={faGithub} size={30} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLinkedInLogin} className="w-16 h-16 bg-white items-center justify-center border-2 border-gray-200 text-blue-500 text-center rounded-full self-center">
                        <FontAwesomeIcon icon={faLinkedinIn} size={30} color="#0A66C2" />
                    </TouchableOpacity>
                </View>
            </View>
            <View className="mt-4 w-full p-4 items-center justify-center">
                {subChildren}
            </View>
        </View>
    );
}
