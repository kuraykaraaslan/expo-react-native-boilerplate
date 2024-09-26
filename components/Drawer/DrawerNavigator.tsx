import Login from '@/app/auth/login';
import Index from '@/app/index';
import { faBell, faBolt, faEnvelope, faMessage, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button, Image, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Settings from '@/app/settings/index';
import { Text } from 'react-native';

const CreateDrawer = createDrawerNavigator();

import { useAuthStore } from '@/libs/zustand';

export default function DrawerNavigator({ navigation }: any) {

    const { user } = useAuthStore();

    const defaultOptions = {
        title: 'Index',
        headerStyle: {
            backgroundColor: '#f4511e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
            fontWeight: 'bold',
        },
        headerShown: true,
        headerTitle: () => (
            <TouchableOpacity style={{ marginLeft: 0, flexDirection: "row" }} onPress={() => navigation.navigate("index")}>
                <FontAwesomeIcon icon={faBolt} size={20} color="#fff" style={{ marginTop: 5 }} />
                <Text style={{ color: "#fff", fontSize: 20, marginLeft: 5, fontWeight: "bold", marginTop: 2 }}>Zeus</Text>
            </TouchableOpacity>
        ),
        headerRight: () => (
            <View style={{ flexDirection: "row" }}>
                <TouchableOpacity style={{ marginRight: 12 }} onPress={user ? () => navigation.navigate("Settings") : () => navigation.navigate("Login")}>
                    {user?.avatar ? <Image source={{ uri: user.avatar }} style={{
                        width: 30, height: 30, borderRadius: 20, borderColor: "#fff", borderWidth: 1
                    }} /> : <FontAwesomeIcon icon={faUser} size={20} color="#fff" />}
                </TouchableOpacity>
                <TouchableOpacity style={{ marginRight: 12 }} onPress={() => navigation.navigate("Login")}>
                    <FontAwesomeIcon icon={faBell} size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={{ marginRight: 12 }} onPress={() => navigation.navigate("Login")}>
                    <FontAwesomeIcon icon={faMessage} size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        ),
    } as any;

    return (
        <CreateDrawer.Navigator>
            <CreateDrawer.Screen options={defaultOptions} name="index" component={Index} />
            <CreateDrawer.Screen options={
                {
                    title: 'Settings',
                    headerStyle: {
                        backgroundColor: '#f4511e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerShown: true,
                }
            } name="Settings" component={Settings} />
        </CreateDrawer.Navigator>
    );
}
