import { faBell } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import Notification from '@/types/Notification';
import { NotificationService } from '@/services/NotificationService';

const NotificationsPage = () => {


    const [notifications, setNotifications] = useState<Notification[]>([]);

    const fetchNotifications = () => {
        NotificationService.listAllNotificationsByUser().then((data) => {
            setNotifications(data || []);
            console.log('Notifications', data);
        });
    }

    useEffect(() => {
        fetchNotifications();
    }, []);


    return (
        <View className="flex-1 bg-white">
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.notificationId || ''}
                renderItem={({ item }) => (
                    <View className="flex-row items-center p-4 border-b border-gray-200">
                        <FontAwesomeIcon icon={faBell}
                        size={20} color={item.read ? 'gray' : 'orange'}
                         style={{ marginRight: 10 }} />
                        <View className="flex-col">
                            <Text className="text-lg">{item.title}</Text>
                            <Text className="text-sm">{item.message}</Text>
                        </View>
                    </View>
                )}
            />
        </View>
    );
};

export default NotificationsPage;