/**
 * AuthContext — provides Firebase auth state to the entire app.
 * Requirements: 1.1, 1.3, 1.5, 1.7, 1.8, 2.4, 5.2
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Firebase_Manager from '@/services/Firebase_Manager';
import { useRobotStore } from '@/services/Robot_State_Manager';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);
  const unsubNotifRef = useRef(null);

  useEffect(() => {
    const unsubscribe = Firebase_Manager.onAuthStateChanged(async (user) => {
      if (!user) {
        // Logout or session cleared — detach notification listener first
        if (unsubNotifRef.current) {
          unsubNotifRef.current();
          unsubNotifRef.current = null;
        }
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      setLoading(false);

      const { uid } = user;

      // 1. Hydrate owned bots (user-scoped)
      // If user has no bots under users/{uid}/bots yet, auto-migrate from registered_bots
      try {
        let bots = await Firebase_Manager.getOwnedBots(uid);
        if (bots.length === 0) {
          // Check if there are legacy bots in registered_bots that belong to this user
          // (either ownerUid matches, or ownerUid is missing — legacy data)
          try {
            const allBots = await Firebase_Manager.getRegisteredBots();
            const myBots = allBots.filter(
              (b) => !b.ownerUid || b.ownerUid === uid
            );
            if (myBots.length > 0) {
              await Firebase_Manager.migrateBotsToUser(uid, myBots.map((b) => b.botId));
              bots = await Firebase_Manager.getOwnedBots(uid);
              console.info('[AuthContext] Migrated', bots.length, 'legacy bots to user scope');
            }
          } catch (migErr) {
            console.warn('[AuthContext] Migration failed, continuing:', migErr);
          }
        }
        useRobotStore.getState().hydrate(bots);
      } catch (e) {
        console.warn('[AuthContext] Failed to hydrate owned bots:', e);
      }

      // 2. Hydrate friend bots — errors are non-blocking
      try {
        const friendBots = await Firebase_Manager.getFriendBots(uid);
        useRobotStore.getState().hydrateFriends(friendBots);
      } catch (e) {
        console.error('[AuthContext] Failed to hydrate friend bots:', e);
      }

      // 3. Start real-time notification listener
      unsubNotifRef.current = Firebase_Manager.listenToNotifications(uid, (notifs) => {
        useRobotStore.getState().setNotifications(notifs);
      });

      // 4. Listen for IP updates from ESP — when bot connects to WiFi it writes its IP to Firebase
      // This allows auto-detection without user needing to manually enter IP
      const store = useRobotStore.getState();
      store.registeredBotIds.forEach((botId) => {
        Firebase_Manager.listenToPath(`registered_bots/${botId}/ip`, (ip) => {
          if (ip && typeof ip === 'string' && ip !== '0.0.0.0') {
            const current = useRobotStore.getState().robots[botId]?.ip;
            if (current !== ip) {
              useRobotStore.getState().setRobotState(botId, { ip });
              console.info(`[AuthContext] Auto-updated IP for ${botId}: ${ip}`);
            }
          }
        });
      });
    });

    return () => {
      unsubscribe();
      // Clean up notification listener on unmount
      if (unsubNotifRef.current) {
        unsubNotifRef.current();
        unsubNotifRef.current = null;
      }
    };
  }, []);

  const login = (email, password) => Firebase_Manager.loginWithEmail(email, password);
  const register = (email, password, displayName) =>
    Firebase_Manager.registerWithEmail(email, password, displayName);
  const logout = () => Firebase_Manager.logout();

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
