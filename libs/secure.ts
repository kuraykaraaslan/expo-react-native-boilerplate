import * as SecureStore from "expo-secure-store";

export const saveToSecure = async (key: string, value: any) => {
  try {
    let jsonValue = JSON.stringify(value);
    await SecureStore.setItemAsync(key, jsonValue);
  } catch (err) {
    console.log(err);
  }
};

export const getFromSecure = async (key: string) => {
  try {
    let jsonValue = await SecureStore.getItemAsync(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (err) {
    console.log(err);
  }
};

export const deleteFromSecure = async (key: string) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.log(err);
  }
};
