import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import { TouchableOpacity } from 'react-native-gesture-handler';
import i18n from '@/libs/localize/localize';

const ChangeEmailPage = ({ navigation } : any) => {
    
    const { user } = useAuthStore();
    const { t } = i18n;

    const [newEmail, setNewEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleChangeEmail = async () => {

        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!regex.test(newEmail)) {
            setMessage('Invalid email address');
            return;
        }

        const result = await AuthService.changeEmail(newEmail);

        if (result) {
            setMessage('Email changed successfully');
        } else {
            setMessage('Failed to change email');
        }

    };

    return (
        <View className='container mx-auto text-center bg-base-100 h-screen p-4 pt-8'>
            <Text className='text-xl mb-1'>Current Email:</Text>
            <TextInput
                className='input input-bordered w-full bg-gray-100 border-2 border-gray-200 p-1 pl-2 text-black'
                value={user?.email}
                editable={false}                
            />
            <Text className='text-xl mt-4 mb-1'>New Email:</Text>
            <TextInput
                className='input input-bordered w-full bg-white border-2 border-gray-200 p-1 pl-2 text-black'
                value={newEmail}
                onChangeText={setNewEmail} 
                placeholder="Enter new email"
                keyboardType="email-address"
            />
            <Text className='text-red-500 mt-2'>{message}</Text>

            <TouchableOpacity onPress={handleChangeEmail} className="w-full p-2">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-3">{t('SETTINGS.UPDATE')}</Text>
            </TouchableOpacity>
        </View>
    );
};


export default ChangeEmailPage;