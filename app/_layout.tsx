import "../global.css"
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from '@/components/Stack/StackNavigator';

// Zustand store and secure store for authentication
import * as ZustandStore from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import * as SecureStore from 'expo-secure-store';
import { TenantMemberService } from "@/services/TenantMemberService";

import Toast from 'react-native-toast-message'


export default function HomeLayout() {

  /*
   AuthService is a service that is used to manage the authentication state of the user. 
   And distribute the state to the application to other services and components.
  */
  TenantMemberService.initialize(ZustandStore, SecureStore, Toast);
  AuthService.initialize(ZustandStore, SecureStore, Toast);

  return (
    <NavigationContainer independent={true}>
      <StackNavigator />
      <Toast
        position='top'
        bottomOffset={20}
      />
    </NavigationContainer>
  );
}
