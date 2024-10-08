import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Button } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import { useAuthStore } from '@/libs/zustand';

import { AuthService } from '@/services/AuthService';
import Session from '@/types/Session';

import { faWindows, faApple, faLinux, faAndroid } from '@fortawesome/free-brands-svg-icons';
import { faQuestion, faComputer, faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

const SingleSession = ({ session, removeSession }: { session: Session, removeSession: any }) => {

    const handleRevoke = () => {
        if (!session.sessionId) {
            return;
        }
        AuthService.revokeSession(session.sessionId).then(() => {
            removeSession(session.sessionId);
        });
    }

    const icon = session.device === 'Windows' ? faWindows : session.device === 'Mac' ? faApple : session.device === 'Linux' ? faLinux : session.device === 'Android' ? faAndroid : faComputer;


    return (
        <View className="flex flex-row justify-center px-4mx-4 mt-2 rounded-lg p-4">
            <View className="flex flex-row justify-start">
                <FontAwesomeIcon icon={icon} size={40} />
            </View>
            <View className="flex flex-col flex-grow px-4">
                <Text className="text-lg">{session.device || 'Windows'}</Text>
                <Text className="text-sm">{session.city || 'Unknown'} - {session.country || 'Unknown'}</Text>
                <Text className="text-sm">{session.ip || 'Unknown'}</Text>
            </View>
            <View className="flex flex-row justify-center px-4 w-1/4 mr-2 h-12">
                <TouchableOpacity onPress={handleRevoke} className="bg-orange-600 p-2 rounded-lg w-32 items-center">
                    <Text className="text-lg text-white font-bold">Revoke</Text>
                </TouchableOpacity>
            </View>
        </View>

    );
}


const ViewSessionsPage = ({ navigation }: any) => {

    const [sessions, setSessions] = useState<Session[]>([]);

    const removeSession = (sessionId: string) => {
        setSessions(sessions.filter((session: Session) => session.sessionId !== sessionId));
    }

    const fetchSessions = () => {
        AuthService.listAllSessionsByUser().then((data) => {
            setSessions(data);
        });
    }

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleRevokeAllSessions = () => {
        console.log('Revoke all sessions');
    }


    return (
        <ScrollView className='container mx-auto text-center bg-base-100 h-screen pt-4'>
            <View className="flex flex-row justify-center px-4">
                <Text className="text-xl font-bold mr-2 w-1/4">Sessions:</Text>
                <View className="flex-grow text-lg mt-2 flex flex-row justify-end mr-4">
                    <TouchableOpacity onPress={fetchSessions}>
                        <FontAwesomeIcon icon={faArrowRotateLeft} size={20} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleRevokeAllSessions} className="bg-orange-600 p-2 rounded-lg w-32 items-center">
                    <Text className="text-lg text-white font-bold">Revoke All</Text>
                </TouchableOpacity>
            </View>
            {sessions.map((session, index) => {
                return <SingleSession key={index} session={session} removeSession={removeSession} />
            }
            )}
        </ScrollView>
    );
}

export default ViewSessionsPage;
