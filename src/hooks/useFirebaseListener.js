/**
 * Hook that attaches a Firebase onValue listener on mount and detaches on unmount.
 * Requirements: 7.3, 8.6
 */
import { useState, useEffect } from 'react';
import Firebase_Manager from '@/services/Firebase_Manager';

/**
 * @param {string} path - Firebase Realtime Database path
 * @returns {{ data: any, loading: boolean }}
 */
export function useFirebaseListener(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    const unsubscribe = Firebase_Manager.listenToPath(path, (val) => {
      setData(val);
      setLoading(false);
    });
    return unsubscribe;
  }, [path]);

  return { data, loading };
}
