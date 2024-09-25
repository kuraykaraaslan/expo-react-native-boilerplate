import Login from '@/app/auth/login';
import Index from '@/app/index';
import { createDrawerNavigator } from '@react-navigation/drawer';

const CreateDrawer = createDrawerNavigator();

export default function DrawerNavigator() {
    return (
        <CreateDrawer.Navigator>
            <CreateDrawer.Screen options={{
                drawerLabel: 'Welcome',
                title: 'Home',
                headerShadowVisible: true,                
            }} name="index" component={Index} />
            <CreateDrawer.Screen options={{
                drawerLabel: 'Login',
                title: 'Login',
                headerShadowVisible: false,
                headerTitle: 'Login',
                
            }} name="auth/login" component={Login} />

        </CreateDrawer.Navigator>
    );
}
