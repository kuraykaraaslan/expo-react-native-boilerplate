import React from 'react';
import { View, Text, Button, Image, TouchableOpacity } from 'react-native';
import { Link, Router } from 'expo-router';
import i18n from '@/libs/localize/localize';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';


export default function Index() {

    const { t } = i18n;

    const selectCategory = (value: string) => {
        console.log("Selected Category", value);
    }

    const [categories, setCategories] = React.useState(["Technology", "Science", "Health", "Sports", "Entertainment"]);


  return (
    <View className="container mx-auto text-center bg-base-100 h-screen">
      <View className="flex justify-center mt-20 px-4">

        <Text className="mt-4 font-bold">{t('BLOG.CATEGORIES')}</Text>
        <View className="flex justify-center mt-4">

        </View>

      </View>
    </View>
  );
}