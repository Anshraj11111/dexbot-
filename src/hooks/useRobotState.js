/**
 * Hook to select a single robot's state from the Zustand store.
 * Requirements: 14.5
 */
import { useRobotStore } from '@/services/Robot_State_Manager';

/**
 * Returns the full state slice for a single robot.
 * @param {string} botId
 * @returns {import('@/services/Robot_State_Manager').RobotState | undefined}
 */
export function useRobotState(botId) {
  return useRobotStore((s) => s.robots[botId]);
}

/**
 * Returns all registered bot IDs.
 * @returns {string[]}
 */
export function useRegisteredBotIds() {
  return useRobotStore((s) => s.registeredBotIds);
}

/**
 * Returns all accepted friend bot IDs.
 * Requirements: 5.1
 * @returns {string[]}
 */
export function useFriendBotIds() {
  return useRobotStore((s) => s.friendBotIds);
}

/**
 * Returns all robot states as an array.
 * @returns {Array}
 */
export function useAllRobots() {
  return useRobotStore((s) =>
    s.registeredBotIds.map((id) => s.robots[id]).filter(Boolean)
  );
}
