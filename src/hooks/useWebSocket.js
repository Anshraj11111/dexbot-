/**
 * Hook that connects to a robot's WebSocket on mount and disconnects on unmount.
 * Requirements: 9.1, 9.7
 */
import { useEffect } from 'react';
import WebSocket_Manager from '@/services/WebSocket_Manager';
import { useRobotState } from './useRobotState';

/**
 * @param {string} botId
 * @param {Function} [onEvent] - Callback for log_message, wifi_update, room_event, notification
 */
export function useWebSocket(botId, onEvent) {
  const robot = useRobotState(botId);

  useEffect(() => {
    if (!botId || !robot?.ip) return;

    WebSocket_Manager.connect(botId, robot.ip, 81, onEvent);

    return () => {
      WebSocket_Manager.disconnect(botId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, robot?.ip]);
}
