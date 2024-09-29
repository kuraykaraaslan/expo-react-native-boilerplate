import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ScrollView, Button, TouchableOpacity } from 'react-native';
import Message from '@/types/Message';
import Inbox from '@/types/Inbox';
import i18n from '@/libs/localize/localize';

import { useAuthStore } from '@/libs/zustand';
import User from '@/types/User';
import { TextInput } from 'react-native-gesture-handler';

const MessageItem = ({ index, inbox, message }: { index: number, inbox: Inbox, message: Message }) => {

    const user = useAuthStore(state => state.user);

    const isSender = message.senderId === user?.userId;

    const userIndex = inbox.users.findIndex(u => u.userId === message.senderId);

    return (
        <View className={'flex p-2 flex-row ' /* + (isSender ? ' flex-row-reverse' : ' flex-row') */} >
            <Image source={{ uri: 'https://picsum.photos/200' }} className='w-10 h-10 rounded-full' />
            <View className='flex flex-col ml-2 mr-2'>
                <Text className='font-bold'>{inbox.users[userIndex]?.name || 'Unknown'}</Text>
                <Text>{message.content}</Text>
            </View>
        </View>
    );
}

const ChatPage = ({ route, navigation }: any) => {


    let inbox = JSON.parse(route.params.inbox) as Inbox;

    return (
        <View className='flex-1 bg-white'>
            <FlatList
                data={inbox.messages}
                onScroll={(e) => console.log('Scrolling')}
                keyExtractor={item => item.messageId}
                renderItem={({ item, index }) => (
                    <MessageItem index={index} inbox={inbox} message={item} />
                )}
            />
            <View className='flex flex-row p-2 bg-gray-100'>
                <TextInput className='flex-grow p-2 bg-white border border-gray-200' placeholder={i18n.t('MESSAGE.ENTER_MESSAGE')} />
                <TouchableOpacity className='bg-blue-500 p-2 rounded-lg ml-2'>
                    <Text className='text-white mt-1'>{i18n.t('MESSAGE.SEND')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default ChatPage;