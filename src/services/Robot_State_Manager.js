/**
 * Robot State Manager — Zustand store with localStorage persistence.
 * Bots survive page refreshes even when Firebase is offline.
 * Requirements: 14.5
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Creates a default robot state object with safe initial values.
 * @param {string} botId
 * @param {string} ip
 * @returns {object}
 */
export function createDefaultRobotState(botId, ip) {
  return {
    botId,
    ip: ip || '',
    isOnline: false,
    wsStatus: 'disconnected',
    wsReconnectAttempt: 0,
    emotion: 'NEUTRAL',
    emotionPending: false,
    battery: 0,
    cpuUsage: 0,
    cpuTemp: 0,
    memoryUsage: 0,
    rssi: 0,
    uptime: 0,
    roomId: null,
    roomName: null,
    firmwareVersion: 'unknown',
    lastSeen: 0,
  };
}

/**
 * Zustand store for all robot state.
 *
 * Persisted to localStorage under key 'dexbot-robot-store'.
 * Only robots, registeredBotIds, and friendBotIds are persisted.
 * Transient state (isOnline, wsStatus, notifications) resets on reload.
 *
 * Shape:
 *   robots:           Record<botId, RobotState>
 *   registeredBotIds: string[]
 *   friendBotIds:     string[]
 *   notifications:    Notification[]
 */
export const useRobotStore = create(
  persist(
    (set, get) => ({
      robots: {},
      registeredBotIds: [],
      friendBotIds: [],
      notifications: [],

      /**
       * Merge a partial state update into a robot's state.
       */
      setRobotState: (botId, partial) =>
        set((s) => ({
          robots: {
            ...s.robots,
            [botId]: { ...s.robots[botId], ...partial },
          },
        })),

      /**
       * Set a robot's online/offline status.
       */
      setOnline: (botId, online) =>
        set((s) => ({
          robots: {
            ...s.robots,
            [botId]: {
              ...s.robots[botId],
              isOnline: online,
              lastSeen: online ? Date.now() : (s.robots[botId]?.lastSeen ?? 0),
            },
          },
        })),

      setEmotion: (botId, emotion) =>
        set((s) => ({
          robots: { ...s.robots, [botId]: { ...s.robots[botId], emotion } },
        })),

      setEmotionPending: (botId, pending) =>
        set((s) => ({
          robots: { ...s.robots, [botId]: { ...s.robots[botId], emotionPending: pending } },
        })),

      setWsStatus: (botId, wsStatus, wsReconnectAttempt = 0) =>
        set((s) => ({
          robots: { ...s.robots, [botId]: { ...s.robots[botId], wsStatus, wsReconnectAttempt } },
        })),

      /**
       * Register a new robot. If it already exists, update its IP if provided.
       */
      registerBot: (botId, ip) =>
        set((s) => {
          const existing = s.robots[botId];
          return {
            registeredBotIds: [...new Set([...s.registeredBotIds, botId])],
            robots: {
              ...s.robots,
              [botId]: existing
                ? { ...existing, ip: ip || existing.ip }
                : createDefaultRobotState(botId, ip),
            },
          };
        }),

      removeBot: (botId) =>
        set((s) => {
          const { [botId]: _removed, ...rest } = s.robots;
          return {
            robots: rest,
            registeredBotIds: s.registeredBotIds.filter((id) => id !== botId),
          };
        }),

      /**
       * Hydrate from Firebase. Updates IP if a newer one is available.
       * Resets transient fields (isOnline, wsStatus) to safe defaults.
       */
      hydrate: (bots) =>
        set((s) => {
          const newRobots = { ...s.robots };
          const newIds = [...s.registeredBotIds];
          for (const { botId, ip } of bots) {
            if (newRobots[botId]) {
              // Update IP if Firebase has one and local doesn't
              if (ip && !newRobots[botId].ip) {
                newRobots[botId] = { ...newRobots[botId], ip };
              }
            } else {
              newRobots[botId] = createDefaultRobotState(botId, ip);
            }
            if (!newIds.includes(botId)) newIds.push(botId);
          }
          return { robots: newRobots, registeredBotIds: newIds };
        }),

      hydrateFriends: (friendBots) =>
        set((s) => {
          const newRobots = { ...s.robots };
          const newFriendIds = [...s.friendBotIds];
          for (const { botId, ip } of friendBots) {
            if (!newRobots[botId]) newRobots[botId] = createDefaultRobotState(botId, ip);
            if (!newFriendIds.includes(botId)) newFriendIds.push(botId);
          }
          return { robots: newRobots, friendBotIds: newFriendIds };
        }),

      addFriendBot: (botId, ip) =>
        set((s) => ({
          robots: s.robots[botId]
            ? s.robots
            : { ...s.robots, [botId]: createDefaultRobotState(botId, ip) },
          friendBotIds: s.friendBotIds.includes(botId)
            ? s.friendBotIds
            : [...s.friendBotIds, botId],
        })),

      removeFriendBot: (botId) =>
        set((s) => ({
          friendBotIds: s.friendBotIds.filter((id) => id !== botId),
        })),

      setNotifications: (notifications) =>
        set(() => ({
          notifications: [...notifications].sort((a, b) => b.createdAt - a.createdAt),
        })),
    }),
    {
      name: 'dexbot-robot-store',
      // Only persist registration data — not transient runtime state
      partialize: (state) => ({
        robots: Object.fromEntries(
          Object.entries(state.robots).map(([id, r]) => [
            id,
            {
              botId: r.botId,
              ip: r.ip,
              // Persist these so they survive reload
              emotion: r.emotion,
              firmwareVersion: r.firmwareVersion,
              lastSeen: r.lastSeen,
              roomId: r.roomId,
              roomName: r.roomName,
              // Reset transient fields to safe defaults
              isOnline: false,
              wsStatus: 'disconnected',
              wsReconnectAttempt: 0,
              emotionPending: false,
              battery: 0,
              cpuUsage: 0,
              cpuTemp: 0,
              memoryUsage: 0,
              rssi: 0,
              uptime: 0,
            },
          ])
        ),
        registeredBotIds: state.registeredBotIds,
        friendBotIds: state.friendBotIds,
      }),
    }
  )
);
