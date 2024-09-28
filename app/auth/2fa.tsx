// Login Page

import React, { useState , useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking } from 'react-native';
import { Link } from "expo-router";
import Logo from '@/components/Logo';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import AuthLayout from '@/components/Layouts/AuthLayout';

import axios from "@/libs/axios";
import i18n from '@/libs/localize/localize';

import { useAuthStore } from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import { faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';


export default function TFAPage({ navigation }: any) {

    const { t } = i18n;

    const { token, otp } = useAuthStore();

    const OTPCanUseEmail = otp?.OTPCanUseEmail || false;
    const OTPCanUsePhone = otp?.OTPCanUsePhone || true;

    const [emailVerificationCode, setEmailVerificationCode] = useState("");
    const [phoneVerificationCode, setPhoneVerificationCode] = useState("");

    const [lastEmailSent, setLastEmailSent] = useState<Date | null>(null);
    const [lastPhoneSent, setLastPhoneSent] = useState<Date | null>(null);

    const [timeLeftEmail, setTimeLeftEmail] = useState(0);
    const [timeLeftPhone, setTimeLeftPhone] = useState(0);

    const [method, setMethod] = useState("email");

    const emailTimeout = 0;
    const phoneTimeout = 0;

    const sendEmailOTP = async () => {
        console.log("Send Email OTP");
        console.log(token);
        setLastEmailSent(new Date());
        await AuthService.sendEmailOTP(token || "");
    }

    const sendPhoneOTP = async () => {
        setLastPhoneSent(new Date());
        await AuthService.sendPhoneOTP(token || "");
    }

    const verifyEmailOTP = async () => {
        const result = await AuthService.verifyEmailOTP(token || "", emailVerificationCode);

        if (result) {
            navigation.navigate("index");
        }
    }

    const verifyPhoneOTP = async () => {
        const result = await AuthService.verifyPhoneOTP(token || "", phoneVerificationCode);
    }

    
    useEffect(() => {
        if (lastEmailSent) {
            const interval = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((lastEmailSent.getTime() + emailTimeout * 1000 - now.getTime()) / 1000);
                if (diff <= 0) {
                    clearInterval(interval);
                    setTimeLeftEmail(0);
                } else {
                    setTimeLeftEmail(diff);
                }
            }, 1000);
            return () => clearInterval(interval);
        }


    }, [lastEmailSent]);

    useEffect(() => {
        if (lastPhoneSent) {
            const interval = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((lastPhoneSent.getTime() + phoneTimeout * 1000 - now.getTime()) / 1000);
                if (diff <= 0) {
                    clearInterval(interval);
                    setTimeLeftPhone(0);
                } else {
                    setTimeLeftPhone(diff);
                }
            }, 1000);
            return () => clearInterval(interval);
        }

    }, [lastPhoneSent]);


    function subChildren(): React.ReactNode {
        return (
            <>
                {method === "email" ? OTPCanUsePhone && (
                    <TouchableOpacity onPress={() => setMethod("phone")} className="flex flex-row justify-center w-full mt-4">
                        <Text className="text-lg text-white font-bold ml-2">{t('AUTH.USE_PHONE')}</Text>
                    </TouchableOpacity>
                ) : OTPCanUseEmail && (
                    <TouchableOpacity onPress={() => setMethod("email")} className="flex flex-row justify-center w-full mt-4">
                        <Text className="text-lg text-white font-bold ml-2">{t('AUTH.USE_EMAIL')}</Text>
                    </TouchableOpacity>
                )}
            </>
        );
    }

    return (
        <AuthLayout subChildren={subChildren()} hideSSO={true}>
            <Text className="text-3xl font-bold">{t('AUTH.TWO_FACTOR_AUTH')}</Text>
            <View className="flex flex-row justify-center w-full mt-2">

                {method === "email" ? (
                    <View className="flex flex-col w-full mt-4">
                        <Text className="text-lg font-bold">{t('AUTH.OTP_CODE')}</Text>
                        <View className="relative">
                            <TextInput className="input input-bordered w-full mt-2 bg-gray-100 border-2 border-gray-200 p-1 pl-2" placeholder={t('AUTH.SIX_DIGIT_CODE')} value={emailVerificationCode} onChangeText={(text) => setEmailVerificationCode(text)} />
                            {timeLeftEmail === 0 ? (
                                <TouchableOpacity onPress={sendEmailOTP} className="absolute right-2 top-5">
                                    <Text className="text-blue-500 underline cursor-pointer">{t('AUTH.SEND_EMAIL_CODE')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text className="absolute right-2 top-5">{t('AUTH.RESEND_IN', { time: timeLeftEmail })}</Text>
                            )}
                        </View>
                        <TouchableOpacity onPress={verifyEmailOTP} className="w-full">
                            <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">{t('AUTH.VERIFY')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="flex flex-col w-full mt-4">
                        <Text className="text-lg font-bold">{t('AUTH.OTP_CODE')}</Text>
                        <View className="relative">
                            <TextInput className="input input-bordered w-full mt-2 bg-gray-100 border-2 border-gray-200 p-1 pl-2" placeholder={t('AUTH.VERIFICATION_CODE')} value={phoneVerificationCode} onChangeText={(text) => setPhoneVerificationCode(text)} />
                            {timeLeftPhone === 0 ? (
                                <TouchableOpacity onPress={sendPhoneOTP} className="absolute right-2 top-5">
                                    <Text className="text-blue-500 underline cursor-pointer">{t('AUTH.SEND_PHONE_CODE')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text className="absolute right-2 top-5">{t('AUTH.RESEND_IN', { time: timeLeftPhone })}</Text>
                            )}
                        </View>
                        <TouchableOpacity onPress={verifyPhoneOTP} className="w-full">
                            <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">{t('AUTH.VERIFY')}</Text>
                        </TouchableOpacity>
                    </View>
                )}



            </View>

        </AuthLayout>
    );
}