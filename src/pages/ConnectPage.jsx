/**
 * ConnectPage — browse all registered bots + search by ID, then send connect requests.
 * Shows all bots from the global registry so user can pick one and connect.
 * Requirements: 3.1–3.8, 7.1, 7.2
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Search, Bot, RefreshCw, Loader2, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRegisteredBotIds } from '@/hooks/useRobotState';
import { useFriendBotIds } from '@/hooks/useRobotState';
import { useToast } from '@/hooks/useToast';
import Firebase_Manager from '@/services/Firebase_Manager';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function ConnectPage() {
  const { currentUser } = useAuth();
  const ownedBotIds = useRegisteredBotIds();
  const friendBotIds = useFriendBotIds();
  const { showToast } = useToast();

  // All bots from global registry
  const [allBots, setAllBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Per-bot request state: { [botId]: 'idle' | 'sending' | 'sent' | 'error' }
  const [requestState, setRequestState] = useState({});

  // Selected own bot for sending requests
  const [selectedOwnBotId, setSelectedOwnBotId] = useState(ownedBotIds[0] || '');

  // Active bot card for sending (which bot's modal is open)
  const [activeBotId, setActiveBotId] = useState(null);

  useEffect(() => {
    if (ownedBotIds.length > 0 && !selectedOwnBotId) {
      setSelectedOwnBotId(ownedBotIds[0]);
    }
  }, [ownedBotIds]);

  // Load all bots from global registry on mount
  useEffect(() => {
    loadAllBots();
  }, []);

  const loadAllBots = async () => {
    setLoadingBots(true);
    setLoadError('');
    try {
      const bots = await Firebase_Manager.getRegisteredBots();
      setAllBots(bots);
    } catch (err) {
      setLoadError('Could not load bots. Check your connection.');
    } finally {
      setLoadingBots(false);
    }
  };

  // Filter: exclude own bots, apply search query
  const filteredBots = allBots.filter((bot) => {
    if (ownedBotIds.includes(bot.botId)) return false; // hide own bots
    if (!searchQuery.trim()) return true;
    return bot.botId.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isFriend = (botId) => friendBotIds.includes(botId);

  const handleSendRequest = async (targetBot) => {
    if (!currentUser) return;

    // Self-connect check
    if (targetBot.ownerUid === currentUser.uid) {
      showToast('Cannot connect to your own bot', 'warning');
      return;
    }

    if (!selectedOwnBotId) {
      showToast('Select one of your bots first', 'warning');
      return;
    }

    if (!targetBot.ownerUid) {
      showToast('This bot has no owner registered — cannot send request', 'warning');
      return;
    }

    setRequestState((prev) => ({ ...prev, [targetBot.botId]: 'sending' }));

    try {
      // Check for duplicate pending request
      let existing = null;
      try {
        existing = await Firebase_Manager.findPendingRequest(selectedOwnBotId, targetBot.botId);
      } catch {
        showToast('Could not check for existing requests. Try again.', 'error');
        setRequestState((prev) => ({ ...prev, [targetBot.botId]: 'idle' }));
        return;
      }

      if (existing) {
        showToast('Request already pending for this bot', 'warning');
        setRequestState((prev) => ({ ...prev, [targetBot.botId]: 'sent' }));
        return;
      }

      await Firebase_Manager.sendConnectRequest(
        currentUser.uid,
        selectedOwnBotId,
        targetBot.botId,
        targetBot.ownerUid
      );

      setRequestState((prev) => ({ ...prev, [targetBot.botId]: 'sent' }));
      showToast(`Connect request sent to ${targetBot.botId}!`, 'success');
    } catch (err) {
      setRequestState((prev) => ({ ...prev, [targetBot.botId]: 'error' }));
      showToast(err?.message ?? 'Failed to send request', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-accent-purple" />
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">Connect to a Bot</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Browse all registered bots and send a connect request
          </p>
        </div>
      </div>

      {/* Your bot selector — which bot sends the request */}
      {ownedBotIds.length > 0 && (
        <GlassCard className="p-4 mb-4">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-2">
            Send request from (your bot)
          </p>
          <div className="flex gap-2 flex-wrap">
            {ownedBotIds.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedOwnBotId(id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all border
                  ${selectedOwnBotId === id
                    ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple'
                    : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                  }`}
              >
                {id}
              </button>
            ))}
          </div>
          {!selectedOwnBotId && (
            <p className="text-xs text-status-offline mt-2">Select a bot to send requests from</p>
          )}
        </GlassCard>
      )}

      {/* Search bar */}
      <GlassCard className="p-4 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Bot ID…"
              maxLength={64}
              className="w-full bg-white/[0.05] border border-white/20 rounded-lg pl-9 pr-3 py-2
                text-sm text-white placeholder-white/20 outline-none
                focus:border-accent-cyan/60 transition-colors"
            />
          </div>
          <button
            onClick={loadAllBots}
            className="p-2 rounded-lg border border-white/10 text-white/40
              hover:text-white/70 hover:border-white/20 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBots ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </GlassCard>

      {/* Bot list */}
      {loadingBots ? (
        <div className="flex items-center justify-center py-16 gap-3 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading bots…</span>
        </div>
      ) : loadError ? (
        <div className="text-center py-12">
          <p className="text-sm text-status-offline mb-3">{loadError}</p>
          <NeonButton onClick={loadAllBots} size="sm">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </NeonButton>
        </div>
      ) : filteredBots.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {searchQuery
              ? `No bots found matching "${searchQuery}"`
              : 'No other bots registered yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-white/30 uppercase tracking-wider">
            {filteredBots.length} bot{filteredBots.length !== 1 ? 's' : ''} found
          </p>
          <AnimatePresence>
            {filteredBots.map((bot) => {
              const state = requestState[bot.botId] || 'idle';
              const alreadyFriend = isFriend(bot.botId);

              return (
                <motion.div
                  key={bot.botId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Bot icon */}
                      <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20
                        flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-accent-cyan" />
                      </div>

                      {/* Bot info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white font-mono truncate">
                          {bot.botId}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5">
                          {bot.ownerUid
                            ? `Owner: ${bot.ownerUid.slice(0, 12)}…`
                            : 'Owner: unknown'}
                        </p>
                        {alreadyFriend && (
                          <span className="inline-flex items-center gap-1 text-xs text-status-online mt-1">
                            <CheckCircle className="w-3 h-3" /> Already connected
                          </span>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="shrink-0">
                        {alreadyFriend ? (
                          <span className="px-3 py-1.5 rounded-lg text-xs bg-status-online/10
                            border border-status-online/30 text-status-online">
                            Friend
                          </span>
                        ) : state === 'sent' ? (
                          <span className="px-3 py-1.5 rounded-lg text-xs bg-accent-purple/10
                            border border-accent-purple/30 text-accent-purple flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Sent
                          </span>
                        ) : (
                          <NeonButton
                            size="sm"
                            variant="purple"
                            onClick={() => handleSendRequest(bot)}
                            disabled={state === 'sending' || !selectedOwnBotId}
                          >
                            {state === 'sending' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            {state === 'sending' ? 'Sending…' : 'Connect'}
                          </NeonButton>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
