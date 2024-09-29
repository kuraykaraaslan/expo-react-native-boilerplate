import { faBell } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import React from 'react';
import { View, Text, FlatList } from 'react-native';


const notifications = [
    { id: '1', message: 'Your order has been shipped!' , read: false},
    { id: '2', message: 'Your package has been delivered.' , read: true},
    { id: '3', message: 'New message from support.' , read: false},
];


const NotificationsPage = () => {
    return (
        <View className="flex-1 bg-white">
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View className="flex-row items-center p-4 border-b border-gray-200">
                        <FontAwesomeIcon icon={faBell}
                        size={20} color={item.read ? 'gray' : 'orange'}
                         style={{ marginRight: 10 }} />
                        <Text>{item.message}</Text>
                    </View>
                )}
            />
        </View>
    );
};

export default NotificationsPage;