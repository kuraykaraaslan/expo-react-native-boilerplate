import React from 'react';
import { View, Text, FlatList } from 'react-native';


const notifications = [
    { id: '1', message: 'Your order has been shipped!' },
    { id: '2', message: 'Your package has been delivered.' },
    { id: '3', message: 'New message from support.' },
];


const NotificationsPage = () => {
    return (
        <View className="flex-1 bg-white">
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View className="p-4 border-b border-gray-200">
                        <Text>{item.message}</Text>
                    </View>
                )}
            />
        </View>
    );
};

export default NotificationsPage;