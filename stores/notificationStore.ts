import { create } from "zustand";

// ============================================================================
// Notification Store
// Unread count for the AppHeader bell. Not persisted — refreshed from the API
// by the header on mount and kept in sync by the notifications screen.
// ============================================================================

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
}));
