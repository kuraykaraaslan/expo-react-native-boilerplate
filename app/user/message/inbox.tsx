import React, { useState , useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ScrollView } from 'react-native';
import Message from '@/types/Message';
import Inbox from '@/types/Inbox';
import i18n from '@/libs/localize/localize';

import { useAuthStore } from '@/libs/zustand';
import User from '@/types/User';
import { TouchableOpacity } from 'react-native-gesture-handler';



const demo: Inbox[] = [
    {
        inboxId: '1',
        users: [
            {
                userId: '1',
                name: 'John Doe',
                avatar: 'https://picsum.photos/250',
            },
            {
                userId: 'cm0kqkxks0000v5f30uxzibs3',
                name: 'Kuray Karaaslan',
                avatar: 'https://picsum.photos/200',
            },
        ],
        messages: [
            {
                messageId: '1',
                senderId: '1',
                content: 'Hello, how are you?',
                createdAt: new Date("2021-09-01T12:00:00"),
            },
            {
                messageId: '2',
                senderId: 'cm0kqkxks0000v5f30uxzibs3',
                content: 'I am good, thank you!',
                createdAt: new Date(),
            },
        ],

    },
    {
        inboxId: '2',
        users: [
            {
                userId: '3',
                name: 'Alice',
                avatar: 'https://picsum.photos/250',
            },
            {
                userId: 'cm0kqkxks0000v5f30uxzibs3',
                name: 'Kuray Karaaslan',
                avatar: 'https://picsum.photos/200',
            },
        ],
        messages: [
            {
                messageId: '1',
                senderId: '3',
                content: 'Hey, What are you doing?',
                createdAt: new Date(), 
            },
            {
                messageId: '2',
                senderId: 'cm0kqkxks0000v5f30uxzibs3',
                content: 'Can you sit on my face?',
                createdAt: new Date("2021-09-01T12:00:00"),
            },
        ]
    }
];

const SingleInbox = ({ self, item, navigation }: { self: User | undefined, item: Inbox, navigation: any }) => {

    const { t } = i18n;

    const otherUser = item.users.find(u => u.userId !== self?.userId);

    const [lastMessage, setLastMessage] = useState<Message | null>(null);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [lastMessageDateText, setLastMessageDateText] = useState<string>('');

    const interval = setInterval(() => {
        updateTime();
    }, 1000);

    function updateTime() {

        if (lastMessage) {
            const date = lastMessage.createdAt;
            const now = new Date();
            const diff = now.getTime() - date.getTime();

            const diffInSec = Math.floor(diff / 1000);
            const diffInMin = Math.floor(diffInSec / 60);
            const diffInHour = Math.floor(diffInMin / 60);
            const diffInDay = Math.floor(diffInHour / 24);
            const diffInWeek = Math.floor(diffInDay / 7);
            const diffInMonth = Math.floor(diffInDay / 30);
            const diffInYear = Math.floor(diffInDay / 365);

            if (diffInSec < 10) {
                setLastMessageDateText(t('DATE.JUST_NOW'));
                return;
            } else if (diffInSec < 60) {
                setLastMessageDateText(t('DATE.SECONDS_AGO', { time: diffInSec }));
                return;
            } else if (diffInMin === 1) {
                setLastMessageDateText(t('DATE.A_MINUTE_AGO'));
                return;
            } else if (diffInMin < 60) {
                setLastMessageDateText(t('DATE.MINUTES_AGO', { time: diffInMin }));
                return;
            } else if (diffInHour === 1) {
                setLastMessageDateText(t('DATE.AN_HOUR_AGO'));
                return;
            } else if (diffInHour < 24) {
                setLastMessageDateText(t('DATE.HOURS_AGO', { time: diffInHour }));
                return;
            } else if (diffInDay === 1) {
                setLastMessageDateText(t('DATE.YESTERDAY'));
                return;
            } else if (diffInDay < 7) {
                setLastMessageDateText(t('DATE.DAYS_AGO', { time: diffInDay }));
                return;
            } else if (diffInWeek === 1) {
                setLastMessageDateText(t('DATE.A_WEEK_AGO'));
                return;
            } else if (diffInWeek < 4) {
                setLastMessageDateText(t('DATE.WEEKS_AGO', { time: diffInWeek }));
                return;
            } else if (diffInMonth === 1) {
                setLastMessageDateText(t('DATE.A_MONTH_AGO'));
                return;
            } else if (diffInMonth < 12) {
                setLastMessageDateText(t('DATE.MONTHS_AGO', { time: diffInMonth }));
                return;
            } else if (diffInYear === 1) {
                setLastMessageDateText(t('DATE.A_YEAR_AGO'));
                return;
            } else {
                setLastMessageDateText(t('DATE.YEARS_AGO', { time: diffInYear }));
                return;
            }

        } else {
            //setLastMessageDateText('');
        } 
    }

    useEffect(() => {
        setLastMessage(item.messages[item.messages.length - 1]);
    }, []);

 


    return (
        <TouchableOpacity onPress={() => navigation.navigate('Chat', { inbox: JSON.stringify(item) })}>
        <View
        className='relative flex flex-row p-4 bg-base-100 mt-2 border-b border-gray-200 drop-shadow-lg'>
            <View className='flex flex-row items-center'>
                <Image className='w-12 h-12 rounded-full' source={{ uri: 'https://fastly.picsum.photos/id/616/200/200.jpg?hmac=QEzyEzU6nVn4d_vdALhsT9UAtTUEVhwrT-kM5ogBqKM' }} />
            </View>
            <View className='flex flex-col ml-4'>
                <Text className='text-lg font-bold'>{otherUser?.name}</Text>
                <Text className='mt-1 text-gray-500'>{item.messages[0].content}</Text>
            </View>
            <View className='absolute right-4 top-4'>
                <Text className='text-gray-500'>{lastMessageDateText}</Text>
            </View>
        </View>
        </TouchableOpacity>
    );
}


const InboxPage = ({ navigation }: any) => {

    const { user } = useAuthStore();

    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [inboxes, setInboxes] = useState<Inbox[]>(demo);

    const [margin, setMargin] = useState<number>(0);

    function loadMore() {
        console.log('Load more');
    }

    function scrollDown(e: any) {
        console.log('Scrolling');
    } 

  
    /*
    return (
        <FlatList   
            data={inboxes}
            style={{ marginTop: margin }}
            keyExtractor={(item) => item.inboxId}
            renderItem={({ item }) => (
                <SingleInbox self={user as User} item={item} />
            )}
            onScroll={(e) => scrollDown(e)}
            onEndReached={loadMore}
            onEndReachedThreshold={0.1}
        />
    );
    */

    return (
        <ScrollView style={{ marginTop: margin }}>
            {inboxes.map((inbox) => (
                <SingleInbox self={user as User} item={inbox} navigation={navigation} />
            ))}
        </ScrollView>
    );
}

export default InboxPage;