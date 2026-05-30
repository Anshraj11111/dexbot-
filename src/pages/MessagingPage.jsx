/**
 * MessagingPage — bot-to-bot real-time messaging.
 * Requirements: 7.1–7.9
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Bot, Send, Radio } from 'lucide-react';
import { useRegisteredBotIds, useFriendBotIds } from '@/hooks/useRobotState';
import { useToast } from '@/hooks/useToast';
import Firebase_Manager from '@/services/Firebase_Manager';
import { getApiClient } from '@/services/apiClient';
import { useRobotStore } from '@/services/Robot_State_Manager';
import { formatTimestamp } from '@/utils/formatTimestamp';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function MessagingPage() {
  const botIds = useRegisteredBotIds();
  const friendBotIds = useFriendBotIds();
  const { showToast } = useToast();

  const [sourceBotId, setSourceBotId] = useState('');
  const [targetBotId, setTargetBotId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const unsubRefs = useRef([]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation when source/target changes
  useEffect(() => {
    // Cleanup previous listeners
    unsubRefs.current.forEach((fn) => { try { fn(); } catch {} });
    unsubRefs.current = [];
    setMessages([]);

    if (!sourceBotId || !targetBotId) return;

    const allMessages = new Map();

    const updateMessages = () => {
      const sorted = Array.from(allMessages.values())
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
      setMessages(sorted);
    };

    // Listen to outbox — messages sent FROM source TO target
    const unsubOut = Firebase_Manager.listenToPath(
      `bots/${sourceBotId}/messages`,
      (data) => {
        // Remove old outbox entries
        for (const [key] of allMessages) {
          if (key.startsWith('out_')) allMessages.delete(key);
        }
        if (data) {
          Object.entries(data).forEach(([id, msg]) => {
            if (msg.to === targetBotId) {
              allMessages.set(`out_${id}`, { id: `out_${id}`, ...msg });
            }
          });
        }
        updateMessages();
      }
    );

    // Listen to inbox — messages received FROM target TO source
    const unsubIn = Firebase_Manager.listenToPath(
      `bots/${sourceBotId}/inbox`,
      (data) => {
        // Remove old inbox entries
        for (const [key] of allMessages) {
          if (key.startsWith('in_')) allMessages.delete(key);
        }
        if (data) {
          Object.entries(data).forEach(([id, msg]) => {
            if (msg.from === targetBotId) {
              allMessages.set(`in_${id}`, { id: `in_${id}`, ...msg });
            }
          });
        }
        updateMessages();
      }
    );

    unsubRefs.current = [unsubOut, unsubIn];

    return () => {
      unsubRefs.current.forEach((fn) => { try { fn(); } catch {} });
      unsubRefs.current = [];
    };
  }, [sourceBotId, targetBotId]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !sourceBotId || !targetBotId) {
      if (!sourceBotId || !targetBotId) {
        showToast('Select both source and target bots first', 'warning');
      }
      return;
    }

    setSending(true);
    try {
      // 1. Store in Firebase (chat history)
      await Firebase_Manager.sendMessage(sourceBotId, targetBotId, trimmed);

      // 2. Send to target bot's OLED display via REST API
      const targetRobot = useRobotStore.getState().robots[targetBotId];
      if (targetRobot?.ip && targetRobot?.isOnline) {
        try {
          const client = getApiClient(targetBotId, `http://${targetRobot.ip}`);
          await client.post('/api/message/send', {
            message: trimmed,
            from: sourceBotId,
          });
        } catch (apiErr) {
          // API call failed but Firebase message was saved — non-fatal
          console.warn('[Messaging] OLED display failed:', apiErr?.message);
        }
      }

      setText('');
    } catch (err) {
      console.error('[Messaging] Send error:', err);
      showToast(`Send failed: ${err?.message ?? 'Check Firebase rules'}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleBroadcast = async () => {
    const trimmed = text.trim();
    if (!trimmed || !sourceBotId) return;
    setSending(true);
    try {
      const failed = await Firebase_Manager.broadcastMessage(sourceBotId, botIds, trimmed);
      setText('');
      if (failed.length > 0) {
        showToast(`Broadcast failed for: ${failed.join(', ')}`, 'warning');
      } else {
        showToast('Broadcast sent to all robots', 'success');
      }
    } catch (err) {
      showToast(`Broadcast failed: ${err?.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const canSend = !!sourceBotId && !!targetBotId && !!text.trim() && !sending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-screen-xl mx-auto"
      style={{ height: 'calc(100vh - 3rem)' }}
    >
      <h1 className="text-2xl font-bold text-white tracking-wider mb-4">Bot Messaging</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100% - 4rem)' }}>

        {/* Sidebar */}
        <GlassCard className="p-4 space-y-4 lg:col-span-1 overflow-y-auto">
          <p className="text-xs text-white/40 uppercase tracking-wider">Select Bots</p>

          <div>
            <label className="text-xs text-white/50 mb-1 block">From (Source)</label>
            <select
              value={sourceBotId}
              onChange={(e) => setSourceBotId(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/20 rounded-lg px-3 py-2
                text-sm text-white outline-none focus:border-accent-cyan/60"
            >
              <option value="">Select bot…</option>
              {botIds.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">To (Target)</label>
            <select
              value={targetBotId}
              onChange={(e) => setTargetBotId(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/20 rounded-lg px-3 py-2
                text-sm text-white outline-none focus:border-accent-cyan/60"
            >
              <option value="">Select bot…</option>
              {botIds.filter((id) => id !== sourceBotId).map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
              {friendBotIds.filter((id) => id !== sourceBotId).map((id) => (
                <option key={`friend-${id}`} value={id}>{id} (friend)</option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-white/10 space-y-1">
            <p className="text-xs text-white/30 mb-2">My Bots</p>
            {botIds.length === 0 && (
              <p className="text-xs text-white/20 px-3 py-1">No bots registered</p>
            )}
            {botIds.map((id) => (
              <button
                key={id}
                onClick={() => {
                  if (id !== sourceBotId) setTargetBotId(id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                  ${targetBotId === id
                    ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                    : 'text-white/60 hover:bg-white/[0.05]'
                  }
                  ${id === sourceBotId ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <Bot className="w-4 h-4 shrink-0" />
                <span className="truncate">{id}</span>
                {id === sourceBotId && <span className="text-xs text-white/30 ml-auto shrink-0">(you)</span>}
              </button>
            ))}

            <p className="text-xs text-white/30 mt-3 mb-2">Friend Bots</p>
            {friendBotIds.length === 0 && (
              <p className="text-xs text-white/20 px-3 py-1">No friend bots yet</p>
            )}
            {friendBotIds.map((id) => (
              <button
                key={id}
                onClick={() => {
                  if (id !== sourceBotId) setTargetBotId(id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                  ${targetBotId === id
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                    : 'text-white/60 hover:bg-white/[0.05]'
                  }
                  ${id === sourceBotId ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <Bot className="w-4 h-4 shrink-0 text-accent-cyan/70" />
                <span className="truncate">{id}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Chat area */}
        <GlassCard className="lg:col-span-3 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
            <MessageSquare className="w-4 h-4 text-accent-cyan" />
            <span className="text-sm font-medium text-white">
              {sourceBotId && targetBotId
                ? `${sourceBotId} → ${targetBotId}`
                : 'Select source and target bots'}
            </span>
            <span className="ml-auto text-xs text-white/30">{messages.length} messages</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {!sourceBotId || !targetBotId ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/20 text-sm">Select bots to start chatting</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/20 text-sm">No messages yet — send the first one!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.from === sourceBotId;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] space-y-1">
                      {!isMine && (
                        <p className="text-xs text-white/40 px-1">{msg.from}</p>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm break-words
                        ${isMine
                          ? 'bg-accent-purple/30 border border-accent-purple/40 text-white rounded-br-sm'
                          : 'bg-white/[0.08] border border-white/10 text-white/90 rounded-bl-sm'
                        }`}>
                        {msg.text}
                      </div>
                      <p className={`text-xs text-white/30 px-1 ${isMine ? 'text-right' : ''}`}>
                        {msg.timestamp ? formatTimestamp(msg.timestamp) : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 shrink-0">
            <div className="flex gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !sourceBotId || !targetBotId
                    ? 'Select bots first…'
                    : 'Type a message… (Enter to send)'
                }
                maxLength={500}
                rows={2}
                disabled={!sourceBotId || !targetBotId || sending}
                className="flex-1 bg-white/[0.05] border border-white/20 rounded-xl px-3 py-2
                  text-sm text-white placeholder-white/20 outline-none resize-none
                  focus:border-accent-cyan/60 transition-colors disabled:opacity-40"
              />
              <div className="flex flex-col gap-1.5">
                <NeonButton
                  onClick={sendMessage}
                  disabled={!canSend}
                  size="sm"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </NeonButton>
                <NeonButton
                  variant="purple"
                  onClick={handleBroadcast}
                  disabled={!sourceBotId || !text.trim() || sending}
                  size="sm"
                  title="Broadcast to all bots"
                >
                  <Radio className="w-4 h-4" />
                </NeonButton>
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/20 mt-1">
              <span>Enter to send · Shift+Enter for newline</span>
              <span className={text.length > 450 ? 'text-yellow-400' : ''}>{text.length}/500</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
