import React from 'react';
import { View, Text, StyleSheet, Image, Button } from 'react-native';
import {  TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import RNPickerSelect from 'react-native-picker-select';
import { useAuthStore } from '@/libs/zustand';

const Settings = ({ navigation }: any) => {

    const { user } = useAuthStore();

    const [name, setName] = React.useState(user?.name);

    return (
        <View className="container mx-auto text-center bg-base-100 h-screen pt-4">
            <View className="flex flex-row justify-center px-4 bg-base-100">
                <Text className="text-xl font-bold mt-6 mr-2 w-1/4">Name:</Text>
                <TextInput className="flex-grow input input-bordered w-full mt-4 bg-gray-100 border-2 border-gray-200 p-1 pl-2" placeholder="Name" onChangeText={(text) => setName(text)} value={name} />
            </View>                
            <View className="flex flex-row justify-center px-4">
                <Text className="text-xl font-bold mt-6 mr-2 w-1/4">Email:</Text>
                <Text className="flex-grow text-lg mt-6">{user?.email}</Text>
                <TouchableOpacity onPress={() => navigation.navigate("ChangeEmail")} className="bg-orange-500 p-2 rounded-lg mt-4 w-20 items-center">
                    <Text className="text-lg text-white font-bold">Change</Text>
                </TouchableOpacity>
            </View>
            <View className="flex flex-row justify-center px-4">
                <Text className="text-xl font-bold mt-6 mr-2 w-1/4">Password:</Text>
                <Text className="flex-grow text-lg mt-6">********</Text>
                <TouchableOpacity onPress={() => navigation.navigate("ChangePassword")} className="bg-orange-500 p-2 rounded-lg mt-4 w-20 items-center">
                    <Text className="text-lg text-white font-bold">Change</Text>
                </TouchableOpacity>
            </View>
            <View className="flex flex-row justify-center px-4">
                <Text className="text-xl font-bold mt-6 mr-2 w-1/4">Phone:</Text>
                <Text className="flex-grow text-lg mt-6">{user?.phone}</Text>
                <TouchableOpacity onPress={() => navigation.navigate("ChangePhone")} className="bg-orange-500 p-2 rounded-lg mt-4 w-20 items-center">
                    <Text className="text-lg text-white font-bold">{user?.phone ? "Change" : "Add"}</Text>
                </TouchableOpacity>
            </View>
            <View className="flex flex-row justify-center px-4 mt-4">
                <Text className="text-xl font-bold mt-6 mr-2 w-1/4">Language:</Text>
                <Text className="flex-grow text-lg mt-6">{user?.language}</Text>
                <RNPickerSelect 
                    onValueChange={(value) => console.log(value)}
                    items={[
                        { label: "English", value: "en" },
                        { label: "Turkish", value: "tr" },
                        { label: "German", value: "de" },
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    bio: {
        fontSize: 16,
        color: 'gray',
        textAlign: 'center',
        marginBottom: 20,
    },
});

export default Settings;