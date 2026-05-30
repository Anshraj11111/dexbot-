/**
 * useNotifications — selects notification state from the Zustand store.
 * Requirements: 2.5, 6.2
 */
import { useRobotStore } from '@/services/Robot_State_Manager';

/**
 * Returns the current notification list and unread count.
 * @returns {{ notifications: object[], unreadCount: number }}
 */
export function useNotifications() {
  const notifications = useRobotStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}
