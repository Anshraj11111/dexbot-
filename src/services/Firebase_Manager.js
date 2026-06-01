/**
 * Firebase Manager — Singleton
 * Encapsulates ALL Firebase SDK calls. No component imports firebase/* directly.
 * Requirements: 1.3, 1.5, 1.7, 7.2, 7.3, 7.6, 7.7, 8.1, 10.4, 10.5, 11.6, 12.2, 12.3, 12.6, 12.7, 14.3
 */
import { initializeApp, deleteApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as _onAuthStateChanged,
  updateProfile,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  remove,
  update,
  onValue,
  off,
  query,
  orderByKey,
  orderByChild,
  equalTo,
  startAt,
  endAt,
  limitToLast,
  serverTimestamp,
} from 'firebase/database';

// ─── Default config from environment variables ────────────────────────────────
const DEFAULT_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

// ─── Internal state ───────────────────────────────────────────────────────────
let _app = null;
let _auth = null;
let _db = null;

function _init(config = DEFAULT_CONFIG) {
  // Reuse existing app if already initialized with same name
  if (getApps().find((a) => a.name === 'dexbot')) {
    _app = getApp('dexbot');
  } else {
    _app = initializeApp(config, 'dexbot');
  }
  _auth = getAuth(_app);
  _db = getDatabase(_app);
  setPersistence(_auth, browserLocalPersistence).catch(console.error);
}

// Initialize on module load
_init();

// ─── Firebase Manager ─────────────────────────────────────────────────────────
const Firebase_Manager = {

  // ── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Sign in with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('firebase/auth').UserCredential>}
   */
  async loginWithEmail(email, password) {
    return signInWithEmailAndPassword(_auth, email, password);
  },

  /**
   * Register a new user with email, password, and display name.
   * @param {string} email
   * @param {string} password
   * @param {string} displayName
   * @returns {Promise<import('firebase/auth').UserCredential>}
   */
  async registerWithEmail(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(_auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred;
  },

  /**
   * Sign out the current user.
   */
  async logout() {
    return signOut(_auth);
  },

  /**
   * Subscribe to auth state changes.
   * @param {(user: import('firebase/auth').User|null) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    return _onAuthStateChanged(_auth, callback);
  },

  /**
   * Returns the currently authenticated user or null.
   */
  getCurrentUser() {
    return _auth.currentUser;
  },

  /**
   * Reinitialize Firebase with a new config (e.g. from Settings page).
   * @param {object} newConfig
   */
  async reinitialize(newConfig) {
    try {
      if (_app) await deleteApp(_app);
    } catch (e) {
      console.warn('[Firebase_Manager] deleteApp error:', e);
    }
    _init(newConfig);
  },

  // ── Registered Bots ───────────────────────────────────────────────────────

  /**
   * Fetch all registered bots from Firebase.
   * @returns {Promise<Array<{botId: string, ip: string, name: string, registeredAt: number}>>}
   */
  async getRegisteredBots() {
    const snap = await get(ref(_db, 'registered_bots'));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([botId, data]) => ({ botId, ...data }));
  },

  /**
   * Fetch all bots owned by the given user.
   * Reads exclusively from `users/{uid}/bots` — never from `registered_bots`.
   * Requirements: 1.2
   * @param {string} uid
   * @returns {Promise<Array<{botId: string, ip: string, name: string, registeredAt: number}>>}
   */
  async getOwnedBots(uid) {
    const snap = await get(ref(_db, `users/${uid}/bots`));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([botId, data]) => ({ botId, ...data }));
  },

  /**
   * Register a new bot under the current user's ownership.
   * Writes to both `users/{uid}/bots/{botId}` and `registered_bots/{botId}` via Promise.all.
   * On partial failure, attempts to roll back the successful write and re-throws the error.
   * `ownerUid` is always taken from `_auth.currentUser.uid`.
   * Requirements: 1.3, 1.4
   * @param {string} botId
   * @param {string} ip
   */
  async registerBot(botId, ip) {
    const ownerUid = _auth.currentUser.uid;
    const registeredAt = Date.now();

    const userBotRef = ref(_db, `users/${ownerUid}/bots/${botId}`);
    const globalBotRef = ref(_db, `registered_bots/${botId}`);

    const userBotData = { ip, name: botId, registeredAt };
    const globalBotData = { ip, name: botId, ownerUid, registeredAt };

    let userWriteDone = false;
    let globalWriteDone = false;

    try {
      await Promise.all([
        set(userBotRef, userBotData).then(() => { userWriteDone = true; }),
        set(globalBotRef, globalBotData).then(() => { globalWriteDone = true; }),
      ]);
    } catch (err) {
      // Attempt rollback of whichever write succeeded
      const rollbacks = [];
      if (userWriteDone) rollbacks.push(remove(userBotRef).catch(() => {}));
      if (globalWriteDone) rollbacks.push(remove(globalBotRef).catch(() => {}));
      await Promise.all(rollbacks);
      throw err;
    }
  },

  /**
   * Remove a registered bot from both the global registry and the user's owned list.
   * @param {string} botId
   */
  async removeBot(botId) {
    const uid = _auth.currentUser?.uid;
    const removals = [remove(ref(_db, `registered_bots/${botId}`))];
    if (uid) {
      removals.push(remove(ref(_db, `users/${uid}/bots/${botId}`)));
    }
    await Promise.all(removals);
  },

  /**
   * Migrate existing bots (with no ownerUid) to a user's owned list.
   * For each botId: reads registered_bots/{botId} for existing data, writes
   * users/{uid}/bots/{botId} with that data, and sets registered_bots/{botId}/ownerUid = uid.
   * Idempotent — calling multiple times with the same args produces no error and leaves data unchanged.
   * @param {string} uid - The user's Firebase UID
   * @param {string[]} botIds - Array of bot IDs to migrate
   * @returns {Promise<void>}
   * Requirements: 1.7
   */
  async migrateBotsToUser(uid, botIds) {
    await Promise.all(
      botIds.map(async (botId) => {
        // Read existing bot data from the global registry
        const snap = await get(ref(_db, `registered_bots/${botId}`));
        const existingData = snap.exists() ? snap.val() : {};

        // Write to user-scoped path (idempotent — set overwrites with same data)
        await set(ref(_db, `users/${uid}/bots/${botId}`), {
          ip: existingData.ip ?? '',
          name: existingData.name ?? botId,
          registeredAt: existingData.registeredAt ?? Date.now(),
        });

        // Update ownerUid in the global registry (idempotent — same value written each time)
        await update(ref(_db, `registered_bots/${botId}`), { ownerUid: uid });
      })
    );
  },

  /**
   * Find an existing pending connect request between two bots.
   * Queries `connect_requests` ordered by `fromBotId`, then filters client-side
   * for a matching `toBotId` and `status === 'pending'`.
   * Requirements: 3.6
   * @param {string} fromBotId
   * @param {string} toBotId
   * @returns {Promise<object|null>} The matching request object (with requestId) or null
   */
  async findPendingRequest(fromBotId, toBotId) {
    const q = query(
      ref(_db, 'connect_requests'),
      orderByChild('fromBotId'),
      equalTo(fromBotId)
    );
    const snap = await get(q);
    if (!snap.exists()) return null;

    const entries = Object.entries(snap.val());
    for (const [requestId, data] of entries) {
      if (data.toBotId === toBotId && data.status === 'pending') {
        return { requestId, ...data };
      }
    }
    return null;
  },

  /**
   * Update a bot's status in Firebase.
   * @param {string} botId
   * @param {object} statusPartial
   */
  async updateBotStatus(botId, statusPartial) {
    await set(ref(_db, `bots/${botId}/status`), {
      ...statusPartial,
      lastSeen: Date.now(),
    });
  },

  // ── Messaging ─────────────────────────────────────────────────────────────

  /**
   * Send a direct message from one bot to another.
   * Writes to both sender's outbox and recipient's inbox.
   * @param {string} fromBotId
   * @param {string} toBotId
   * @param {string} text
   */
  async sendMessage(fromBotId, toBotId, text) {
    const timestamp = Date.now();
    const messageData = { from: fromBotId, to: toBotId, text, timestamp };
    const outboxRef = push(ref(_db, `bots/${fromBotId}/messages`));
    const inboxRef = ref(_db, `bots/${toBotId}/inbox/${outboxRef.key}`);
    await set(outboxRef, messageData);
    await set(inboxRef, messageData);
  },

  /**
   * Send a message to a room.
   * @param {string} roomId
   * @param {string} fromBotId
   * @param {string} text
   */
  async sendRoomMessage(roomId, fromBotId, text) {
    const messageData = { from: fromBotId, text, timestamp: Date.now() };
    await push(ref(_db, `rooms/${roomId}/messages`), messageData);
    await set(ref(_db, `rooms/${roomId}/lastActivity`), Date.now());
  },

  /**
   * Broadcast a message to all registered bots.
   * @param {string} fromBotId
   * @param {string[]} allBotIds
   * @param {string} text
   * @returns {Promise<string[]>} Array of botIds that failed
   */
  async broadcastMessage(fromBotId, allBotIds, text) {
    const timestamp = Date.now();
    const failed = [];
    await Promise.all(
      allBotIds.map(async (toBotId) => {
        try {
          const messageData = { from: fromBotId, to: toBotId, text, timestamp };
          await push(ref(_db, `bots/${toBotId}/inbox`), messageData);
        } catch {
          failed.push(toBotId);
        }
      })
    );
    return failed;
  },

  /**
   * Listen to a bot's inbox for new messages.
   * @param {string} botId
   * @param {(messages: object[]) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  listenToInbox(botId, callback) {
    const inboxRef = ref(_db, `bots/${botId}/inbox`);
    const handler = (snap) => {
      if (!snap.exists()) { callback([]); return; }
      const msgs = Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
      callback(msgs.sort((a, b) => a.timestamp - b.timestamp));
    };
    onValue(inboxRef, handler);
    return () => off(inboxRef, 'value', handler);
  },

  /**
   * Listen to a room's messages.
   * @param {string} roomId
   * @param {(messages: object[]) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  listenToRoomMessages(roomId, callback) {
    const msgsRef = ref(_db, `rooms/${roomId}/messages`);
    const handler = (snap) => {
      if (!snap.exists()) { callback([]); return; }
      const msgs = Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
      callback(msgs.sort((a, b) => a.timestamp - b.timestamp));
    };
    onValue(msgsRef, handler);
    return () => off(msgsRef, 'value', handler);
  },

  /**
   * Clear all messages between two bots (both outbox and inbox).
   * @param {string} botId
   * @param {string} targetBotId
   */
  async clearConversation(botId, targetBotId) {
    // Get all messages in outbox and remove ones to/from targetBotId
    const [outSnap, inSnap] = await Promise.all([
      get(ref(_db, `bots/${botId}/messages`)),
      get(ref(_db, `bots/${botId}/inbox`)),
    ]);

    const removals = [];

    if (outSnap.exists()) {
      Object.entries(outSnap.val()).forEach(([id, msg]) => {
        if (msg.to === targetBotId || msg.from === targetBotId) {
          removals.push(remove(ref(_db, `bots/${botId}/messages/${id}`)));
        }
      });
    }

    if (inSnap.exists()) {
      Object.entries(inSnap.val()).forEach(([id, msg]) => {
        if (msg.from === targetBotId || msg.to === targetBotId) {
          removals.push(remove(ref(_db, `bots/${botId}/inbox/${id}`)));
        }
      });
    }

    await Promise.all(removals);
  },

  /**
   * Load the most recent N messages between two bots.
   * @param {string} botId
   * @param {string} targetBotId
   * @param {number} [limit=50]
   * @returns {Promise<object[]>}
   */
  async loadRecentMessages(botId, targetBotId, limit = 50) {
    const q = query(ref(_db, `bots/${botId}/messages`), limitToLast(limit));
    const snap = await get(q);
    if (!snap.exists()) return [];
    const all = Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
    return all
      .filter((m) => m.to === targetBotId || m.from === targetBotId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  // ── Rooms ─────────────────────────────────────────────────────────────────

  /**
   * Create a new room.
   * @param {string} name
   * @returns {Promise<string>} The new room ID
   */
  async createRoom(name) {
    const roomRef = push(ref(_db, 'rooms'));
    await set(roomRef, { name, createdAt: Date.now(), lastActivity: Date.now(), members: {} });
    return roomRef.key;
  },

  /**
   * Add a bot to a room.
   * @param {string} roomId
   * @param {string} botId
   */
  async addBotToRoom(roomId, botId) {
    await set(ref(_db, `rooms/${roomId}/members/${botId}`), true);
    await set(ref(_db, `registered_bots/${botId}/roomId`), roomId);
  },

  /**
   * Remove a bot from a room.
   * @param {string} roomId
   * @param {string} botId
   */
  async removeBotFromRoom(roomId, botId) {
    await remove(ref(_db, `rooms/${roomId}/members/${botId}`));
    await remove(ref(_db, `registered_bots/${botId}/roomId`));
  },

  /**
   * Send a command to all bots in a room.
   * @param {string} roomId
   * @param {string} command
   * @param {string} userId
   */
  async sendRoomCommand(roomId, command, userId) {
    await push(ref(_db, `rooms/${roomId}/commands`), {
      command,
      sentBy: userId,
      timestamp: Date.now(),
    });
    await set(ref(_db, `rooms/${roomId}/lastActivity`), Date.now());
  },

  /**
   * Listen to room activity (commands + messages).
   * @param {string} roomId
   * @param {(events: object[]) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  listenToRoomActivity(roomId, callback) {
    const roomRef = ref(_db, `rooms/${roomId}`);
    const handler = (snap) => {
      if (!snap.exists()) { callback([]); return; }
      const data = snap.val();
      const events = [];
      if (data.commands) {
        Object.entries(data.commands).forEach(([id, cmd]) =>
          events.push({ id, type: 'command', ...cmd })
        );
      }
      if (data.messages) {
        Object.entries(data.messages).forEach(([id, msg]) =>
          events.push({ id, type: 'message', ...msg })
        );
      }
      events.sort((a, b) => a.timestamp - b.timestamp);
      callback(events.slice(-20));
    };
    onValue(roomRef, handler);
    return () => off(roomRef, 'value', handler);
  },

  /**
   * Get all rooms.
   * @returns {Promise<object[]>}
   */
  async getRooms() {
    const snap = await get(ref(_db, 'rooms'));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
  },

  /**
   * Listen to all rooms.
   * @param {(rooms: object[]) => void} callback
   * @returns {() => void} Unsubscribe
   */
  listenToRooms(callback) {
    const roomsRef = ref(_db, 'rooms');
    const handler = (snap) => {
      if (!snap.exists()) { callback([]); return; }
      const rooms = Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
      callback(rooms);
    };
    onValue(roomsRef, handler);
    return () => off(roomsRef, 'value', handler);
  },

  // ── OTA History ───────────────────────────────────────────────────────────

  /**
   * Record a successful OTA update in Firebase.
   * @param {string} botId
   * @param {{ filename: string, fileSize: number, deployedAt: number }} record
   */
  async recordOtaHistory(botId, record) {
    await push(ref(_db, `bots/${botId}/ota_history`), record);
  },

  /**
   * Get OTA history for a bot, sorted most recent first.
   * @param {string} botId
   * @returns {Promise<object[]>}
   */
  async getOtaHistory(botId) {
    const snap = await get(ref(_db, `bots/${botId}/ota_history`));
    if (!snap.exists()) return [];
    return Object.entries(snap.val())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.deployedAt - a.deployedAt);
  },

  // ── Metrics History ───────────────────────────────────────────────────────

  /**
   * Write a metrics data point to Firebase.
   * @param {string} botId
   * @param {{ battery: number, cpuUsage: number, cpuTemp: number, memoryUsage: number, rssi: number }} metrics
   */
  async writeMetricsPoint(botId, metrics) {
    const timestamp = Date.now();
    await set(ref(_db, `bots/${botId}/metrics_history/${timestamp}`), {
      ...metrics,
      timestamp,
    });
  },

  /**
   * Query metrics history for a bot within a time range.
   * @param {string} botId
   * @param {number} fromTimestamp
   * @param {number} toTimestamp
   * @returns {Promise<object[]>}
   */
  async queryMetricsHistory(botId, fromTimestamp, toTimestamp) {
    const q = query(
      ref(_db, `bots/${botId}/metrics_history`),
      orderByKey(),
      startAt(String(fromTimestamp)),
      endAt(String(toTimestamp))
    );
    const snap = await get(q);
    if (!snap.exists()) return [];
    return Object.values(snap.val()).sort((a, b) => a.timestamp - b.timestamp);
  },

  // ── User Settings ─────────────────────────────────────────────────────────

  /**
   * Save user settings to Firebase.
   * @param {string} userId
   * @param {object} settings
   */
  async saveUserSettings(userId, settings) {
    await set(ref(_db, `users/${userId}/settings`), settings);
  },

  /**
   * Load user settings from Firebase.
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async loadUserSettings(userId) {
    const snap = await get(ref(_db, `users/${userId}/settings`));
    return snap.exists() ? snap.val() : null;
  },

  // ── Social / Connect Requests ─────────────────────────────────────────────

  /**
   * Look up a bot's owner from the global registry.
   * Reads a single node at `registered_bots/{botId}`.
   * Returns null if the bot is not found or has no ownerUid set.
   * Requirements: 3.1
   * @param {string} botId
   * @returns {Promise<{ownerUid: string, name: string}|null>}
   */
  async lookupBotOwner(botId) {
    const snap = await get(ref(_db, `registered_bots/${botId}`));
    if (!snap.exists()) return null;
    const data = snap.val();
    if (!data.ownerUid) return null;
    return { ownerUid: data.ownerUid, name: data.name ?? botId };
  },

  /**
   * Send a connect request from one bot to another.
   * Writes to `connect_requests/{requestId}` and `users/{toOwnerUid}/notifications/{notifId}`
   * via Promise.all. On partial failure, rolls back the successful write and re-throws.
   * Requirements: 3.4, 3.8
   * @param {string} fromUid
   * @param {string} fromBotId
   * @param {string} toBotId
   * @param {string} toOwnerUid
   * @returns {Promise<string>} The generated requestId
   */
  async sendConnectRequest(fromUid, fromBotId, toBotId, toOwnerUid) {
    const now = Date.now();
    const senderName = _auth.currentUser?.displayName || fromUid;

    // Generate a unique requestId key using push (no data written yet)
    const requestRef = push(ref(_db, 'connect_requests'));
    const requestId = requestRef.key;

    const connectRequestData = {
      fromUid,
      fromBotId,
      toBotId,
      toOwnerUid,
      status: 'pending',
      createdAt: now,
    };

    // Generate a unique notifId key
    const notifRef = push(ref(_db, `users/${toOwnerUid}/notifications`));
    const notifId = notifRef.key;

    const notificationData = {
      type: 'connect_request',
      requestId,
      fromUid,
      fromBotId,
      toBotId,
      senderName,
      createdAt: now,
      read: false,
    };

    let requestWriteDone = false;
    let notifWriteDone = false;

    try {
      await Promise.all([
        set(requestRef, connectRequestData).then(() => { requestWriteDone = true; }),
        set(notifRef, notificationData).then(() => { notifWriteDone = true; }),
      ]);
    } catch (err) {
      // Attempt rollback of whichever write succeeded; swallow rollback errors
      const rollbacks = [];
      if (requestWriteDone) rollbacks.push(remove(requestRef).catch(() => {}));
      if (notifWriteDone) rollbacks.push(remove(notifRef).catch(() => {}));
      await Promise.all(rollbacks);
      throw err;
    }

    return requestId;
  },

  /**
   * Accept a connect request, creating mutual friend entries for both users.
   *
   * Steps (all four writes via Promise.all):
   *  1. Fetch connect_requests/{requestId} — throws if not found or status !== 'pending'
   *  2. Fetch registered_bots/{fromBotId} and registered_bots/{toBotId} in parallel
   *  3. Write users/{ownerUid}/friends/{fromBotId}  (owner gains requester's bot)
   *  4. Write users/{fromUid}/friends/{toBotId}     (requester gains owner's bot)
   *  5. Update connect_requests/{requestId}/status to 'accepted'
   *  6. Remove users/{ownerUid}/notifications/{notifId}
   *
   * Requirements: 4.1, 4.2
   * @param {string} requestId
   * @param {string} notifId
   * @param {string} ownerUid - The current user's UID (the one accepting the request)
   * @returns {Promise<void>}
   */
  async acceptConnectRequest(requestId, notifId, ownerUid) {
    // 1. Fetch the connect request
    const requestSnap = await get(ref(_db, `connect_requests/${requestId}`));
    if (!requestSnap.exists() || requestSnap.val().status !== 'pending') {
      throw new Error('Request no longer valid');
    }
    const request = requestSnap.val();
    const { fromUid, fromBotId, toBotId } = request;

    // 2. Fetch both bots' data in parallel for the friend entries
    const [fromBotSnap, toBotSnap] = await Promise.all([
      get(ref(_db, `registered_bots/${fromBotId}`)),
      get(ref(_db, `registered_bots/${toBotId}`)),
    ]);

    const fromBotData = fromBotSnap.exists() ? fromBotSnap.val() : {};
    const toBotData = toBotSnap.exists() ? toBotSnap.val() : {};

    const now = Date.now();

    // 3–6. All four writes in parallel
    await Promise.all([
      // Owner gains requester's bot as a friend
      set(ref(_db, `users/${ownerUid}/friends/${fromBotId}`), {
        ip: fromBotData.ip ?? '',
        name: fromBotData.name ?? fromBotId,
        ownerUid: fromUid,
        addedAt: now,
      }),
      // Requester gains owner's bot as a friend
      set(ref(_db, `users/${fromUid}/friends/${toBotId}`), {
        ip: toBotData.ip ?? '',
        name: toBotData.name ?? toBotId,
        ownerUid: ownerUid,
        addedAt: now,
      }),
      // Mark the request as accepted
      update(ref(_db, `connect_requests/${requestId}`), { status: 'accepted' }),
      // Remove the notification
      remove(ref(_db, `users/${ownerUid}/notifications/${notifId}`)),
    ]);
  },

  /**
   * Reject a connect request, updating its status and removing the notification.
   * No friend entries are created.
   * Requirements: 4.3
   * @param {string} requestId
   * @param {string} notifId
   * @param {string} ownerUid - The current user's UID (the one rejecting the request)
   * @returns {Promise<void>}
   */
  async rejectConnectRequest(requestId, notifId, ownerUid) {
    // Verify the request is still pending before acting
    const requestSnap = await get(ref(_db, `connect_requests/${requestId}`));
    if (!requestSnap.exists() || requestSnap.val().status !== 'pending') {
      throw new Error('Request no longer valid');
    }

    await Promise.all([
      update(ref(_db, `connect_requests/${requestId}`), { status: 'rejected' }),
      remove(ref(_db, `users/${ownerUid}/notifications/${notifId}`)),
    ]);
  },

  /**
   * Fetch all friend bots for a given user.
   * Reads from `users/{uid}/friends`.
   * Requirements: 5.2
   * @param {string} uid
   * @returns {Promise<Array<{botId: string, ip: string, name: string, ownerUid: string, addedAt: number}>>}
   */
  async getFriendBots(uid) {
    const snap = await get(ref(_db, `users/${uid}/friends`));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([botId, data]) => ({ botId, ...data }));
  },

  /**
   * Attach a real-time listener to a user's notifications.
   * Fires the callback immediately with the current list, then on every change.
   * Returns an unsubscribe function.
   * Requirements: 2.2
   * @param {string} uid
   * @param {(notifications: object[]) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  listenToNotifications(uid, callback) {
    const notifRef = query(
      ref(_db, `users/${uid}/notifications`),
      limitToLast(50)
    );
    const handler = (snap) => {
      if (!snap.exists()) { callback([]); return; }
      const notifs = Object.entries(snap.val())
        .map(([notifId, data]) => ({ notifId, ...data }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callback(notifs);
    };
    onValue(notifRef, handler);
    return () => off(notifRef, 'value', handler);
  },

  // ── Generic Listener ──────────────────────────────────────────────────────

  /**
   * Attach a generic onValue listener to any Firebase path.
   * @param {string} path
   * @param {(data: any) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  listenToPath(path, callback) {
    const dbRef = ref(_db, path);
    const handler = (snap) => callback(snap.exists() ? snap.val() : null);
    onValue(dbRef, handler);
    return () => off(dbRef, 'value', handler);
  },
};

export default Firebase_Manager;
