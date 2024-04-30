/*
 * Welcome to Expo React Redux Boilerplate
 *
 * on this file there is a table of example pages
 * that you can use to start building your app
 * 
 * pages:
 * - Home
 * - Login
 * - Register
 * - Dashboard
 * - Profile
 * - Settings
 * - About
 * - Contact
 * 
 * to use these pages, you can import them from the
 */

import React from 'react';
import { View, Text, Button, Image } from 'react-native';
import { Link, Route } from 'expo-router';

export default function Home() {
  return (
    <View className="container mx-auto text-center bg-base-100 h-screen">
      <View className="flex justify-center mt-20 px-4">
        <Image source={require('@/assets/images/home.png')} className="w-full h-64 mb-4" />
        <Text className="text-4xl font-bold">Welcome to Expo React Redux Boilerplate</Text>
        <Text className="text-lg mt-4">This is a boilerplate project for building mobile applications using Expo, React, and Redux. It provides a solid foundation for creating cross-platform mobile apps with a predictable state container for managing application data flow.</Text>
        <Text className="mt-4 font-bold">To get started, you can use the following pages:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }} className="w-full border-2 border-black divide-y-2 divide-black divide-x-2">
          
          <View className="w-1/2 p-2">
            <Text className="text-lg font-bold rounded-md">Category</Text>
          </View>
          <View className="border-l-2 border-black p-2 w-1/2">
            <Text className="text-lg font-bold rounded-md">Page</Text>
          </View>
          <View className="w-1/2 p-2 border-t-2 border-black">
            <Text className="text-lg">Auth</Text>
          </View>
          <View className="border-l-2 border-t-2 border-black p-2 w-1/2">
            <Link href="/auth/login" className="text-lg text-orange-600">Login</Link>
          </View>
          <View className="w-1/2 p-2 border-t-2 border-black">
            <Text className="text-lg">Auth</Text>
          </View>
          <View className="border-l-2 border-t-2 border-black p-2 w-1/2">
            <Link href="/auth/register" className="text-lg text-orange-600">Register</Link>
          </View>
        </View>
      </View>
    </View>
  );
}