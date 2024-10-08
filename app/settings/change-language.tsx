import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import { TouchableOpacity } from 'react-native-gesture-handler';
import i18n from '@/libs/localize/localize';
import { Picker } from '@react-native-picker/picker';
import { continents, countries, languages } from 'countries-list'


const ChangeLanguagePage = ({ navigation } : any) => {
    
    const { user } = useAuthStore();
    const { t } = i18n;

    const [newLanguage, setNewLanguage] = useState(user?.language || 'en');
    const [message, setMessage] = useState('');

    const langKeys = Object.keys(languages);
    const langValues = Object.values(languages);

    const handleChangeLanguage = async () => {

        // 2-3 letter language code
        const regex = /^[a-zA-Z]{2,3}$/;

        await AuthService.changeLanguage(newLanguage);
    };

    return (
        <View className='container mx-auto text-center bg-base-100 h-screen p-4 pt-8'>
            <Text className='text-xl mt-4 mb-1'>New Language:</Text>
            <Picker
            className='w-full bg-gray-100 border-2 border-gray-200 p-1 pl-2 text-black'
                selectedValue={newLanguage}
                onValueChange={(itemValue, itemIndex) => console.log(itemValue)}
            >
                {langValues.map((lang, index) => {
                    return <Picker.Item key={index} label={lang.name} value={langKeys[index]} />
                })}
    
            </Picker>
            <Text className='text-red-500 mt-2'>{message}</Text>
            <TouchableOpacity onPress={handleChangeLanguage} className="w-full p-2">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-3">{t('SETTINGS.UPDATE')}</Text>
            </TouchableOpacity>
        </View>
    );
}

export default ChangeLanguagePage;