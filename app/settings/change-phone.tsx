import React, { useState, useRef, useEffect } from "react";

import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import { TouchableOpacity } from 'react-native-gesture-handler';
import i18n from '@/libs/localize/localize';

import { PhoneNumberUtil } from 'google-libphonenumber';

import LocalesConfig from "@/config/locales";
import { Picker, PickerItemProps } from "@react-native-picker/picker";

const ChangePhonePage = ({ navigation }: any) => {
    
    const { user } = useAuthStore();
    const { t } = i18n;

    const [message, setMessage] = useState('');

    const [phone, setPhone] = useState(user?.phone || '+905459223554');

    const [formattedCountryCode, setFormattedCountryCode] = useState('');
    const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');

    const phoneUtil = PhoneNumberUtil.getInstance();

    const availableCountries = LocalesConfig.countries;


    const handleChangePhone = async () => {

        const regex = /^[0-9]{10}$/;

        const phone = formattedCountryCode + formattedPhoneNumber;

        var countryCode ;

        for (let i = 0; i < availableCountries.length; i++) {
            if (formattedCountryCode === availableCountries[i].phoneCode) {
                countryCode = availableCountries[i].code;
                break;
            }
        }

        //validate phone number
        const isValid = phoneUtil.isValidNumber(phoneUtil.parse(phone, countryCode));

        console.log('isValid', isValid);

        if (isValid) {

            console.log('Phone is valid');

            await AuthService.changePhone(phone);

        } else {
            setMessage('Invalid phone number');
            console.log('Invalid phone number');
        } 

        console.log('isValid', isValid);

    };

    useEffect(() => {
    
        setFormattedPhoneNumber(prev => {
            return formattedPhoneNumber.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        });
    }
    , [ formattedPhoneNumber]);


    useEffect(() => {
        if (phone) {
            for (let i = 0; i < availableCountries.length; i++) {
                if (phone.startsWith(availableCountries[i].phoneCode)) {
                    setFormattedCountryCode(availableCountries[i].phoneCode);
                    setFormattedPhoneNumber(phone.slice(availableCountries[i].phoneCode.length));
                    break;
                }
            }
        }
    }, [phone]);

    return (
        <View className='container mx-auto text-center bg-base-100 h-screen p-4 pt-8'>
            <Text className='text-xl mb-1'>Update Phone Number:</Text>
            <View className='relative drop-shadow-sm bg-white rounded-lg p-2'>
            <Picker
                style={{ width: 120 , position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 1 , backgroundColor: 'white'}}
                selectedValue={formattedCountryCode}
                onValueChange={(itemValue, itemIndex) => setFormattedCountryCode(itemValue)}
            >
                {availableCountries.map((country, index) => {
                    return <Picker.Item key={index} label={country.phoneCode} value={country.phoneCode} />
                })}
            </Picker>
            <TextInput
                style={{ paddingLeft: 120, backgroundColor: 'white', height: 55 }}
                value={formattedPhoneNumber}
                onChangeText={(text) => setFormattedPhoneNumber(text)}
                placeholder='Phone Number'
            />

            </View>
            <Text className='text-red-500 mt-2'>{message}</Text>
            <TouchableOpacity onPress={handleChangePhone} className="w-full p-2">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-3">{t('SETTINGS.UPDATE')}</Text>
            </TouchableOpacity>

        </View>
    );
}

export default ChangePhonePage;