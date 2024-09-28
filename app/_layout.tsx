import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import "../global.css"
import { Provider } from 'react-redux';
import store from '@/libs/redux/store';

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';

import MainStackNavigator from '@/components/Stack/StackNavigator';
import DrawerNavigator from '@/components/Drawer/DrawerNavigator';
import StackNavigator from '@/components/Stack/StackNavigator';

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
