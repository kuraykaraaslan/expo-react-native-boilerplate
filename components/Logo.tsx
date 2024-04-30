import React from "react";
import { View, Text, Button } from "react-native";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faHeart, faMugSaucer, faPhone } from '@fortawesome/free-solid-svg-icons'

export default function Logo() {
        return (
            <View className="flex flex-row justify-center w-full gap-4 items-center justify-center">
                <Text className="text-4xl font-bold text-white">I</Text>
                <FontAwesomeIcon icon={faHeart} size={40} color="white" />
                <Text className="text-4xl font-bold text-white">Boilerplate</Text>
            </View>
        );
    }

