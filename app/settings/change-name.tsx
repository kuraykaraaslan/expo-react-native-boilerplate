import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import { TouchableOpacity } from 'react-native-gesture-handler';
import i18n from '@/libs/localize/localize';

const ChangeNamePage = ({ navigation }: any) => {
    
    const { user } = useAuthStore();
    const { t } = i18n;

    const [newName, setNewName] = useState('');
    const [message, setMessage] = useState('');

    const handleChangeName = async () => {

        // Regex to check if the name contains only alphabets and spaces and turkish characters ç,ı,ğ,ö,ş,ü,Ç,İ,Ğ,Ö,Ş,Ü
        const regex = /^[a-zA-ZçÇıİğĞöÖşŞüÜ\s]+$/;


        if (!regex.test(newName)) {
            setMessage('Invalid email address');
            return;
        }

        const result = await AuthService.changeName(newName);

        if (result) {
            setMessage('Email changed successfully');
        } else {
            setMessage('Failed to change email');
        }

    };

    return (
        <View className='container mx-auto text-center bg-base-100 h-screen p-4 pt-8'>
            <Text className='text-xl mb-1'>Current Name:</Text>
            <TextInput
                className='input input-bordered w-full bg-gray-100 border-2 border-gray-200 p-1 pl-2 text-black'
                value={user?.name}
                editable={false}
            />
            <Text className='text-xl mt-4 mb-1'>New Name:</Text>
            <TextInput
                className='input input-bordered w-full bg-white border-2 border-gray-200 p-1 pl-2 text-black'
                value={newName}
                onChangeText={setNewName} 
                placeholder="Enter new name"
            />
            <Text className='text-red-500 mt-2'>{message}</Text>
            <TouchableOpacity onPress={handleChangeName} className="w-full p-2">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-3">{t('SETTINGS.UPDATE')}</Text>
            </TouchableOpacity>
        </View>
    );
};


export default ChangeNamePage;