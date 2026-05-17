import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#f4511e" },
        headerTintColor: "#ffffff",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="change-email" options={{ title: "Change Email" }} />
      <Stack.Screen name="change-language" options={{ title: "Language" }} />
      <Stack.Screen name="sessions" options={{ title: "Active Sessions" }} />
    </Stack>
  );
}
