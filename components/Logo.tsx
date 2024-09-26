import React from "react";
import { View, Text, Button } from "react-native";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faBolt, faHeart, faMugSaucer, faPhone } from '@fortawesome/free-solid-svg-icons'

export default function Logo() {
        return (
            <View className="flex flex-row justify-center w-full gap-2 items-center justify-center">
                <FontAwesomeIcon icon={faBolt} size={40} color="white" />
                <Text className="text-4xl font-bold text-white">Zeus</Text>
            </View>
        );
    }

