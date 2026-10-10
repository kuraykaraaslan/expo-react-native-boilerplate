import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getPushPermission, type PushPermission } from "@/libs/push";

/**
 * The OS notification permission, re-read whenever the app returns to the foreground (the person may have
 * changed it in system settings). `null` until the first read.
 */
export function usePushPermission(): { permission: PushPermission | null; refresh: () => Promise<PushPermission> } {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const next = await getPushPermission();
    if (mounted.current) setPermission(next);
    return next;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [refresh]);

  return { permission, refresh };
}
