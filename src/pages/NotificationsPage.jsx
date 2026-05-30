/**
 * NotificationsPage — view and act on incoming connect requests.
 * Requirements: 2.6, 2.7, 4.1–4.6, 7.3
 */
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, X, Bot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/useToast';
import { useRobotStore } from '@/services/Robot_State_Manager';
import Firebase_Manager from '@/services/Firebase_Manager';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { formatTimestamp } from '@/utils/formatTimestamp';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { showToast } = useToast();

  // Req 2.7 — mark all as read when page is viewed
  useEffect(() => {
    const store = useRobotStore.getState();
    const updated = store.notifications.map((n) =>
      n.read ? n : { ...n, read: true }
    );
    store.setNotifications(updated);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (notif) => {
    // Req 4.4 — stale check
    if (notif.status && notif.status !== 'pending') {
      showToast('Request no longer valid', 'warning');
      useRobotStore.getState().setNotifications(
        useRobotStore.getState().notifications.filter((n) => n.notifId !== notif.notifId)
      );
      return;
    }

    try {
      await Firebase_Manager.acceptConnectRequest(
        notif.requestId,
        notif.notifId,
        currentUser.uid
      );

      // Req 4.5 — add friend bot to store
      // Fetch ip from registered_bots via lookupBotOwner (we only need ip)
      let ip = '';
      try {
        const snap = await Firebase_Manager.lookupBotOwner(notif.fromBotId);
        ip = snap?.ip ?? '';
      } catch {}
      useRobotStore.getState().addFriendBot(notif.fromBotId, ip);

      showToast('Bot connected!', 'success');
    } catch (err) {
      // Req 4.6 — show error, keep notification visible
      if (err?.message === 'Request no longer valid') {
        showToast('Request no longer valid', 'warning');
        useRobotStore.getState().setNotifications(
          useRobotStore.getState().notifications.filter((n) => n.notifId !== notif.notifId)
        );
      } else {
        showToast(err?.message ?? 'Failed to accept request', 'error');
      }
    }
  };

  const handleReject = async (notif) => {
    // Req 4.4 — stale check
    if (notif.status && notif.status !== 'pending') {
      showToast('Request no longer valid', 'warning');
      useRobotStore.getState().setNotifications(
        useRobotStore.getState().notifications.filter((n) => n.notifId !== notif.notifId)
      );
      return;
    }

    try {
      await Firebase_Manager.rejectConnectRequest(
        notif.requestId,
        notif.notifId,
        currentUser.uid
      );
      showToast('Request rejected', 'info');
    } catch (err) {
      if (err?.message === 'Request no longer valid') {
        showToast('Request no longer valid', 'warning');
        useRobotStore.getState().setNotifications(
          useRobotStore.getState().notifications.filter((n) => n.notifId !== notif.notifId)
        );
      } else {
        showToast(err?.message ?? 'Failed to reject request', 'error');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-accent-purple" />
        <h1 className="text-2xl font-bold text-white tracking-wider">Notifications</h1>
        {notifications.length > 0 && (
          <span className="ml-auto text-xs text-white/40">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Empty state — Req 2.6 */}
      {notifications.length === 0 && (
        <div className="text-center py-16 text-white/20 text-sm">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
          No notifications yet
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-3">
        {notifications.map((notif) => (
          <GlassCard key={notif.notifId} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-purple/10 border border-accent-purple/30
                flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-accent-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  <span className="text-accent-cyan">{notif.senderName ?? notif.fromUid}</span>
                  {' '}wants to connect
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  From bot <span className="text-white/60">{notif.fromBotId}</span>
                  {' '}→ your bot <span className="text-white/60">{notif.toBotId}</span>
                </p>
                {notif.createdAt && (
                  <p className="text-xs text-white/25 mt-1">{formatTimestamp(notif.createdAt)}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3 justify-end">
              <NeonButton
                variant="danger"
                size="sm"
                onClick={() => handleReject(notif)}
              >
                <X className="w-3.5 h-3.5" /> Reject
              </NeonButton>
              <NeonButton
                variant="success"
                size="sm"
                onClick={() => handleAccept(notif)}
              >
                <Check className="w-3.5 h-3.5" /> Accept
              </NeonButton>
            </div>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}
