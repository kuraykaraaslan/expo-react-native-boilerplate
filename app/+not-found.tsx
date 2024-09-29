import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import React from 'react';
import { View, Text } from 'react-native';

import { TouchableOpacity } from 'react-native-gesture-handler';


export default function NotFoundScreen({ navigation }: { navigation: any }) {
  return (
    <View className="container mx-auto text-center bg-base-100 h-screen">
      <View className="flex justify-center mt-20 px-4">
        <Text className="mt-4 font-bold">404 - Page Not Found</Text>
        <View className="flex justify-center mt-4">
          <TouchableOpacity onPress={() => navigation.navigate("Home")} className="bg-blue-500 p-2 rounded-lg mt-4 w-20 items-center">
            <Text className="text-lg text-white font-bold">Home</Text>
          </TouchableOpacity> 
        </View>
      </View>
    </View>
  );
}
