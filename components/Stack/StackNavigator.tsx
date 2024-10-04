import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import TFA from '@/app/auth/2fa';
import Login from '@/app/auth/login';
import Register from '@/app/auth/register';
import DrawerNavigator from '@/components/Drawer/DrawerNavigator';
import Settings from '@/app/settings/index';
import SelectTenanPage from '@/app/auth/select-tenant';

const Stack = createStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={DrawerNavigator}
        options={{ headerShown: false }} // Hide header when showing the drawer
      />
      <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
      <Stack.Screen name="TFA" component={TFA} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
      <Stack.Screen name="SelectTenant" component={SelectTenanPage} options={{ headerShown: false, presentation: 'modal' }} />
    </Stack.Navigator>
  );
}