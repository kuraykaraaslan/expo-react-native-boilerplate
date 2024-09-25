import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import "../global.css"
import { Provider } from 'react-redux';
import store from '@/libs/redux/store';

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';

import MainStackNavigator from '@/components/Stack/StackNavigator';

export default function HomeLayout() {

  return (
    <Provider store={store}>
      <NavigationContainer independent={true}>
        <MainStackNavigator/>
      </NavigationContainer>
    </Provider>
  );
}
