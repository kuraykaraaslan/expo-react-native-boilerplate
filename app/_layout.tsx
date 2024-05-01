import { Slot } from 'expo-router';
import "../global.css"
import { Provider } from 'react-redux';
import store from '@/libs/redux/store';

import React , { useEffect } from 'react';

export default function HomeLayout() {

  useEffect(() => {
    console.log("Store", store.getState());
  }, []);


  return (
    <Provider store={store}>
      <Slot />
    </Provider>
  );
}
