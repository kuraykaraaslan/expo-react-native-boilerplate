import "../global.css"
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from '@/components/Stack/StackNavigator';

// Zustand store and secure store for authentication
import * as ZustandStore from '@/libs/zustand';
import { AuthService } from '@/services/AuthService';
import * as SecureStore from 'expo-secure-store';



export default function HomeLayout() {

  /*
   AuthService is a service that is used to manage the authentication state of the user. 
   And distribute the state to the application to other services and components.
  */
  AuthService.initialize(ZustandStore, SecureStore);

  return (
      <NavigationContainer independent={true}>
        <StackNavigator />
      </NavigationContainer>
  );
}
