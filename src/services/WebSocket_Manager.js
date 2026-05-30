/**
 * WebSocket Manager — Singleton
 * Manages persistent WebSocket connections to all online robots.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.7, 9.8, 14.2
 */
import { computeReconnectDelay } from '@/utils/reconnectDelay';
import { useRobotStore } from './Robot_State_Manager';

const MAX_ATTEMPTS = 10;

/**
 * @typedef {{ ws: WebSocket|null, reconnectTimer: ReturnType<typeof setTimeout>|null, attempts: number, onEvent: Function|null }} ConnectionEntry
 */

/** @type {Map<string, ConnectionEntry>} */
const connections = new Map();

/**
 * Parses a raw WebSocket message string.
 * Returns the parsed event object or null if invalid.
 * Never throws.
 * @param {string} raw
 * @returns {object|null}
 */
function _parseMessage(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      return parsed;
    }
    return null;
  } catch (e) {
    console.warn('[WebSocket_Manager] Failed to parse message:', e.message);
    return null;
  }
}

/**
 * Routes a parsed WebSocket event to the Zustand store or the onEvent callback.
 * @param {string} botId
 * @param {object} event
 * @param {Function} onEvent
 */
function _routeEvent(botId, event, onEvent) {
  const store = useRobotStore.getState();
  const { type, payload } = event;

  switch (type) {
    case 'status_sync':
      store.setRobotState(botId, {
        isOnline: payload.online ?? true,
        emotion: payload.emotion,
        battery: payload.battery,
        cpuUsage: payload.cpuUsage,
        cpuTemp: payload.cpuTemp,
        memoryUsage: payload.memoryUsage,
        uptime: payload.uptime,
        roomId: payload.roomId ?? null,
      });
      break;
    case 'emotion_update':
      store.setEmotion(botId, payload.emotion);
      break;
    case 'battery_update':
      store.setRobotState(botId, { battery: payload.battery });
      break;
    case 'metrics_update':
      store.setRobotState(botId, {
        battery: payload.battery,
        cpuUsage: payload.cpuUsage,
        cpuTemp: payload.cpuTemp,
        memoryUsage: payload.memoryUsage,
        rssi: payload.rssi,
      });
      break;
    case 'log_message':
    case 'wifi_update':
    case 'room_event':
    case 'notification':
      // Forwarded to the component-level callback
      if (typeof onEvent === 'function') onEvent(event);
      break;
    default:
      if (typeof onEvent === 'function') onEvent(event);
  }
}

/**
 * Schedules a reconnect attempt with exponential backoff.
 */
function _scheduleReconnect(botId, ip, port, onEvent, attempt) {
  const entry = connections.get(botId);
  if (!entry) return;

  if (attempt >= MAX_ATTEMPTS) {
    useRobotStore.getState().setWsStatus(botId, 'disconnected', attempt);
    return;
  }

  const delay = computeReconnectDelay(attempt);
  useRobotStore.getState().setWsStatus(botId, 'reconnecting', attempt);

  entry.reconnectTimer = setTimeout(() => {
    _connect(botId, ip, port, onEvent, attempt);
  }, delay);
}

/**
 * Internal connect implementation.
 */
function _connect(botId, ip, port, onEvent, attempt = 0) {
  const url = `ws://${ip}:${port}`;
  let ws;

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error('[WebSocket_Manager] Failed to create WebSocket:', e);
    _scheduleReconnect(botId, ip, port, onEvent, attempt + 1);
    return;
  }

  const entry = connections.get(botId) ?? { ws: null, reconnectTimer: null, attempts: 0, onEvent: null };
  entry.ws = ws;
  entry.attempts = attempt;
  entry.onEvent = onEvent;
  connections.set(botId, entry);

  ws.onopen = () => {
    useRobotStore.getState().setWsStatus(botId, 'connected', 0);
    entry.attempts = 0;
  };

  ws.onmessage = (event) => {
    const parsed = _parseMessage(event.data);
    if (parsed) {
      _routeEvent(botId, parsed, onEvent);
    }
  };

  ws.onerror = () => {
    // Silently ignore — onclose will handle reconnect
  };

  ws.onclose = () => {
    const currentEntry = connections.get(botId);
    if (!currentEntry) return; // Intentionally disconnected
    const nextAttempt = (currentEntry.attempts ?? 0) + 1;
    _scheduleReconnect(botId, ip, port, onEvent, nextAttempt);
  };
}

const WebSocket_Manager = {
  /**
   * Establishes a WebSocket connection to a robot.
   * @param {string} botId
   * @param {string} ip
   * @param {number} [port=81]
   * @param {Function} [onEvent] - Callback for log_message, wifi_update, etc.
   */
  connect(botId, ip, port = 81, onEvent = null) {
    // If already connected, skip
    const existing = connections.get(botId);
    if (existing?.ws?.readyState === WebSocket.OPEN) return;

    // Clear any existing reconnect timer
    if (existing?.reconnectTimer) {
      clearTimeout(existing.reconnectTimer);
    }

    connections.set(botId, { ws: null, reconnectTimer: null, attempts: 0, onEvent });
    _connect(botId, ip, port, onEvent, 0);
  },

  /**
   * Closes the WebSocket connection for a robot and cancels reconnect timers.
   * @param {string} botId
   */
  disconnect(botId) {
    const entry = connections.get(botId);
    if (!entry) return;

    if (entry.reconnectTimer) {
      clearTimeout(entry.reconnectTimer);
    }

    if (entry.ws) {
      entry.ws.onclose = null; // Prevent reconnect on intentional close
      entry.ws.close();
    }

    connections.delete(botId);
    useRobotStore.getState().setWsStatus(botId, 'disconnected', 0);
  },

  /**
   * Returns the current connection status for a robot.
   * @param {string} botId
   * @returns {'connected'|'reconnecting'|'disconnected'}
   */
  getStatus(botId) {
    return useRobotStore.getState().robots[botId]?.wsStatus ?? 'disconnected';
  },

  /**
   * Resets the reconnect counter and starts a fresh connection attempt.
   * Used by the "Retry" button after exhausting all attempts.
   * @param {string} botId
   * @param {string} ip
   * @param {number} [port=81]
   */
  retry(botId, ip, port = 81) {
    const entry = connections.get(botId);
    const onEvent = entry?.onEvent ?? null;
    this.disconnect(botId);
    this.connect(botId, ip, port, onEvent);
  },

  /** Exposed for testing only */
  _parseMessage,
};

export default WebSocket_Manager;
