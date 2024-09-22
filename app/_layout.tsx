import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Drawer  from '@/components/Drawer';
import { Slot } from 'expo-router';
import "../global.css"
import { Provider } from 'react-redux';
import store from '@/libs/redux/store';

import React, { useEffect } from 'react';

export default function HomeLayout() {

  useEffect(() => {
    console.log("Store", store.getState());
  }, []);


  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer>
        </Drawer>
      </GestureHandlerRootView>
    </Provider>
  );
}
