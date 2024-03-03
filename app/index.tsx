import { Stack } from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const Home = () => (
  <>
    <Stack.Screen
      options={{
        title: 'My home',
      }}
    />
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  </>
);

export default Home;