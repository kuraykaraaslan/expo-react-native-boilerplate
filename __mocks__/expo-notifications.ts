// Jest stand-in for expo-notifications (the native module is absent under jest-expo).
export const AndroidImportance = { DEFAULT: 3, HIGH: 4 };
export const DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT";

export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: "undetermined", granted: false, canAskAgain: true });
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: "granted", granted: true, canAskAgain: true });
export const getExpoPushTokenAsync = jest.fn().mockResolvedValue({ type: "expo", data: "ExponentPushToken[abc123]" });
export const setNotificationChannelAsync = jest.fn().mockResolvedValue(null);
export const setNotificationHandler = jest.fn();
export const addPushTokenListener = jest.fn(() => ({ remove: jest.fn() }));
export const useLastNotificationResponse = jest.fn(() => undefined);
