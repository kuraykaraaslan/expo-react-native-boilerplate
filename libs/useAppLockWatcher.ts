import { useEffect } from "react";
import { AppState } from "react-native";
import { useAppLockStore } from "@/libs/appLock";

/** Locks the app when it returns from the background after the grace period. Mount once, inside the signed-in shell. */
export function useAppLockWatcher(): void {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      const store = useAppLockStore.getState();
      if (state === "active") store.markForegrounded(Date.now());
      else store.markBackgrounded(Date.now());
    });
    return () => sub.remove();
  }, []);
}
