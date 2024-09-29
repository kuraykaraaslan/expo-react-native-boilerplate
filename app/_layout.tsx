import "../global.css"
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from '@/components/Stack/StackNavigator';

// Zustand store and secure store for authentication
import { useAuthStore } from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import * as SecureStore from 'expo-secure-store';



export default function HomeLayout() {

  // Initialize the auth service with the zustand store and secure store
  AuthService.initialize(useAuthStore, SecureStore);

  return (
      <NavigationContainer independent={true}>
        <StackNavigator />
      </NavigationContainer>
  );
}
