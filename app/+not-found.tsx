import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          This screen does not exist.
        </Text>
        <Link href="/" className="text-blue-500 underline">
          Go to home screen
        </Link>
      </View>
    </>
  );
}
