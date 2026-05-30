/**
 * SettingsPage — device pairing with Bot ID + IP address (manual entry).
 * Firebase sync is attempted but failures are non-blocking — the bot is
 * always registered locally so the dashboard works even when Firebase is offline.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Settings, Bell, Plus, Trash2, Loader2, XCircle, Edit2, Check, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useRobotStore } from '@/services/Robot_State_Manager';
import { useRegisteredBotIds } from '@/hooks/useRobotState';
import Firebase_Manager from '@/services/Firebase_Manager';

// Validate IPv4 or hostname
function isValidIp(ip) {
  if (!ip) return false;
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return true;
  // hostname (e.g. dexbot.local)
  if (/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})*$/.test(ip)) return true;
  return false;
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const botIds = useRegisteredBotIds();

  const [newBotId, setNewBotId] = useState('');
  const [newIp, setNewIp] = useState('');
  const [pairError, setPairError] = useState('');
  const [registering, setRegistering] = useState(false);

  // Inline IP editing state: { [botId]: string }
  const [editingIp, setEditingIp] = useState({});
  const [editIpValue, setEditIpValue] = useState({});

  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    Firebase_Manager.loadUserSettings(currentUser.uid)
      .then((s) => {
        if (s?.notificationsEnabled !== undefined) setNotifEnabled(s.notificationsEnabled);
      })
      .catch(() => {});
  }, [currentUser]);

  const handleRegisterBot = async () => {
    const botId = newBotId.trim();
    const ip = newIp.trim();

    if (!botId) { setPairError('Bot ID is required'); return; }
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(botId)) {
      setPairError('Bot ID: 1–64 chars, letters/numbers/underscore/hyphen only');
      return;
    }
    if (!ip) { setPairError('IP address is required'); return; }
    if (!isValidIp(ip)) { setPairError('Enter a valid IP address (e.g. 10.166.217.41)'); return; }

    const existingIds = Array.isArray(botIds) ? botIds : [];
    if (existingIds.includes(botId)) {
      setPairError('A robot with this ID is already registered');
      return;
    }

    setRegistering(true);
    setPairError('');

    // Always register locally first — works even if Firebase is offline
    useRobotStore.getState().registerBot(botId, ip);

    // Try Firebase in background — non-blocking
    Firebase_Manager.registerBot(botId, ip).catch((err) => {
      console.warn('[Settings] Firebase registerBot failed (offline?):', err?.message);
    });

    setNewBotId('');
    setNewIp('');
    setRegistering(false);
    showToast(`${botId} registered (${ip})`, 'success');
  };

  const handleRemoveBot = async (botId) => {
    useRobotStore.getState().removeBot(botId);
    Firebase_Manager.removeBot(botId).catch(() => {});
    showToast(`${botId} removed`, 'success');
  };

  // Start editing IP for a bot
  const startEditIp = (botId, currentIp) => {
    setEditingIp((prev) => ({ ...prev, [botId]: true }));
    setEditIpValue((prev) => ({ ...prev, [botId]: currentIp || '' }));
  };

  // Save edited IP
  const saveEditIp = async (botId) => {
    const ip = (editIpValue[botId] || '').trim();
    if (!isValidIp(ip)) {
      showToast('Invalid IP address', 'error');
      return;
    }
    // Update local store
    useRobotStore.getState().setRobotState(botId, { ip });
    // Try Firebase update in background
    Firebase_Manager.registerBot(botId, ip).catch(() => {});
    setEditingIp((prev) => ({ ...prev, [botId]: false }));
    showToast(`${botId} IP updated to ${ip}`, 'success');
  };

  const cancelEditIp = (botId) => {
    setEditingIp((prev) => ({ ...prev, [botId]: false }));
  };

  const handleNotifToggle = async () => {
    if (!notifEnabled) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        showToast('Browser notifications were denied.', 'warning');
        return;
      }
    }
    const next = !notifEnabled;
    setNotifEnabled(next);
    if (currentUser) {
      Firebase_Manager.saveUserSettings(currentUser.uid, { notificationsEnabled: next }).catch(() => {});
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRegisterBot();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-screen-md mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-white tracking-wider">Settings</h1>

      {/* ── Device Pairing ─────────────────────────────────────────── */}
      <GlassCard className="p-5 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70 uppercase tracking-wider">
          <Bot className="w-4 h-4 text-accent-cyan" /> Device Pairing
        </h3>

        <p className="text-xs text-white/40">
          Enter your robot's Bot ID and its current IP address. The bot will be
          registered locally immediately — Firebase sync happens in the background.
        </p>

        {/* Bot ID + IP inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block uppercase tracking-wider">Bot ID</label>
            <input
              type="text"
              value={newBotId}
              onChange={(e) => { setNewBotId(e.target.value); setPairError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. dex_4 or DEX_841FE8264C2C"
              className={`w-full bg-white/[0.05] border rounded-xl px-4 py-2.5 text-sm text-white
                placeholder-white/20 outline-none transition-colors
                ${pairError && !newBotId.trim() ? 'border-status-offline/60' : 'border-white/20 focus:border-accent-cyan/60'}`}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block uppercase tracking-wider">IP Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newIp}
                onChange={(e) => { setNewIp(e.target.value); setPairError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 10.166.217.41"
                className={`flex-1 bg-white/[0.05] border rounded-xl px-4 py-2.5 text-sm text-white
                  placeholder-white/20 outline-none transition-colors
                  ${pairError && !newIp.trim() ? 'border-status-offline/60' : 'border-white/20 focus:border-accent-cyan/60'}`}
              />
              <NeonButton
                onClick={handleRegisterBot}
                disabled={!newBotId.trim() || !newIp.trim() || registering}
                size="md"
              >
                {registering
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Plus className="w-4 h-4" /> Add</>
                }
              </NeonButton>
            </div>
          </div>
          {pairError && (
            <p className="text-xs text-status-offline flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {pairError}
            </p>
          )}
        </div>

        {/* Registered bots list */}
        {botIds.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
              Registered Robots ({botIds.length})
            </p>
            {botIds.map((id) => {
              const robot = useRobotStore.getState().robots[id];
              const isEditing = editingIp[id];
              return (
                <div
                  key={id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl
                    bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${robot?.isOnline ? 'bg-status-online' : 'bg-white/20'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-mono">{id}</p>
                      {isEditing ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="text"
                            value={editIpValue[id] || ''}
                            onChange={(e) => setEditIpValue((prev) => ({ ...prev, [id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditIp(id); if (e.key === 'Escape') cancelEditIp(id); }}
                            className="bg-white/[0.08] border border-accent-cyan/40 rounded-lg px-2 py-1
                              text-xs text-white outline-none w-36"
                            autoFocus
                          />
                          <button onClick={() => saveEditIp(id)} className="text-status-online hover:text-status-online/80 p-0.5">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => cancelEditIp(id)} className="text-white/40 hover:text-white/60 p-0.5">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-xs text-white/30">
                            {robot?.ip ? `IP: ${robot.ip}` : 'IP: not set'}
                          </p>
                          <button
                            onClick={() => startEditIp(id, robot?.ip)}
                            className="text-white/20 hover:text-accent-cyan transition-colors"
                            title="Edit IP"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveBot(id)}
                    className="text-white/30 hover:text-status-offline transition-colors p-1 shrink-0"
                    title="Remove robot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {botIds.length === 0 && (
          <div className="text-center py-6 text-white/20">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No robots registered yet</p>
          </div>
        )}
      </GlassCard>

      {/* ── Notifications ──────────────────────────────────────────── */}
      <GlassCard className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
          <Bell className="w-4 h-4 text-accent-purple" /> Notifications
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Browser push notifications</p>
            <p className="text-xs text-white/30 mt-0.5">Get alerts when robots go offline or send messages</p>
          </div>
          <button
            onClick={handleNotifToggle}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0
              ${notifEnabled ? 'bg-accent-cyan' : 'bg-white/20'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
              ${notifEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </GlassCard>

      {/* ── Account Info ───────────────────────────────────────────── */}
      <GlassCard className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
          <Settings className="w-4 h-4 text-accent-blue" /> Account
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/40">User</span>
            <span className="text-white font-mono">{currentUser?.displayName ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Email</span>
            <span className="text-white/70">{currentUser?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Robots registered</span>
            <span className="text-accent-cyan font-bold">{botIds.length}</span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
