import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import { TouchableOpacity } from 'react-native-gesture-handler';
import i18n from '@/libs/localize/localize';

const ChangePasswordPage = ({ navigation }: any) => {

    const { user } = useAuthStore();
    const { t } = i18n;

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleChangePassword = async () => {

        if (newPassword !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
        }

        const result = await AuthService.changePassword(currentPassword, newPassword);

        if (result) {
            setMessage('Password changed successfully');
        } else {
            setMessage('Failed to change password');
        }

    };

    return (
        <View className='container mx-auto text-center bg-base-100 h-screen p-4 pt-8'>
            <Text className='text-xl mb-1'>Current Password:</Text>
            <TextInput
                className='input input-bordered w-full bg-gray-100 border-2 border-gray-200 p-1 pl-2 text-black'
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={true}
            />
            <Text className='text-xl mt-4 mb-1'>New Password:</Text>
            <TextInput
                className='input input-bordered w-full bg-white border-2 border-gray-200 p-1 pl-2 text-black'
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={true}
            />
            <Text className='text-xl mt-4 mb-1'>Confirm Password:</Text>
            <TextInput
                className='input input-bordered w-full bg-white border-2 border-gray-200 p-1 pl-2 text-black'
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={true}
            />
            <Text className='text-red-500 mt-2'>{message}</Text>

            <TouchableOpacity onPress={handleChangePassword} className="w-full p-2">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-3">{t('SETTINGS.UPDATE')}</Text>
            </TouchableOpacity>
        </View>
    );
}

export default ChangePasswordPage;