import Login from '@/app/auth/login';
import Index from '@/app/index';
import { createDrawerNavigator } from '@react-navigation/drawer';

const CreateDrawer = createDrawerNavigator();

function Drawer() {
    return (
        <CreateDrawer.Navigator>
            <CreateDrawer.Screen options={{
                drawerLabel: 'Home',
                title: 'Home',
                headerShadowVisible: true,
                headerTitle: 'Homes',
                
            }} name="index" component={Index} />
            <CreateDrawer.Screen options={{
                drawerLabel: 'Login',
                title: 'Login',
                headerShadowVisible: true,
                headerTitle: 'Login',
                
            }} name="auth/login" component={Login} />

        </CreateDrawer.Navigator>
    );
}

export default Drawer;
