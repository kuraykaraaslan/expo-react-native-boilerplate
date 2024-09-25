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
import RNPickerSelect from 'react-native-picker-select';
import React from 'react';
import { View, Text, Button, Image, TouchableOpacity } from 'react-native';
import { Link, Router } from 'expo-router';
import i18n from '@/libs/localize/localize';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';


export default function Home() {

  const { t } = i18n;
  const [currentLanguage, setCurrentLanguage] = React.useState("en"); // Default language is "en
  const [availableLanguages, setAvailableLanguages] = React.useState(i18n.languages);

  function changeLanguage(value: string) {
    i18n.changeLanguage(value);
    setCurrentLanguage(value);
    console.log("Language changed to", value);
  }

  function changePage(value: string) {
    router.push(value as any);
  }

  function openDeveloperWebsite() {
    WebBrowser.openBrowserAsync('https://kuray.dev');
  }

  return (
    <View className="container mx-auto text-center bg-base-100 h-screen pt-4">
      <View className="flex justify-center px-4">
        <Image source={require('@/assets/images/home.png')} className="w-full h-64 mb-4" />
        <Text className="text-4xl font-bold">{t('HOME.WELCOME')}</Text>
        <Text className="text-lg mt-4">{t('HOME.DESCRIPTION')}</Text>

        <Text className="mt-4 font-bold">{t('HOME.LANGUAGES')}</Text>
        <View className="flex justify-center mt-4">
          <RNPickerSelect style={{ placeholder: { color: 'black' }, viewContainer: { borderWidth: 2, borderColor: 'black', borderRadius: 5, padding: 0 } }}
            placeholder={{ label: t('HOME.SELECT_LANGUAGE'), value: null }}
            onValueChange={(value) => changeLanguage(value)}
            items={availableLanguages.map((lang) => ({ label: t(`LANGUAGES.${lang.toUpperCase()}`)
              , value: lang }))}
          />
        </View>


        <Text className="mt-4 font-bold">{t('HOME.PAGES')}</Text>
        <View className="flex justify-center mt-4">
          <RNPickerSelect style={{ placeholder: { color: 'black' }, viewContainer: { borderWidth: 2, borderColor: 'black', borderRadius: 5, padding: 0 } }}
            placeholder={{ label: t('HOME.SELECT_PAGE'), value: null }}
            onValueChange={(value) => changePage(value)}
            items={[
              { label: t('PAGES.LOGIN'), value: '/auth/login' },
              { label: t('PAGES.REGISTER'), value: '/auth/register' },
              { label: t('PAGES.FORGOT_PASSWORD'), value: '/auth/forgot-password' },
              { label: t('PAGES.HOME'), value: '/home' }
            ]}
          />
        </View>
        <View className="mt-4">
          {/* <Link for kuray.dev as development */}
          <TouchableOpacity onPress={openDeveloperWebsite} className="text-blue-500 underline cursor-pointer">
            <Text className="mt-2 font-bold">{t('HOME.DEVELOPER')}</Text>
          </TouchableOpacity>
        </View>


      </View>
    </View>
  );
}