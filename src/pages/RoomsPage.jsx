/**
 * RoomsPage — room management system.
 * Requirements: 8.1–8.7
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, Plus, Users, Trash2, Send, Smile } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useToast } from '@/hooks/useToast';
import { useRegisteredBotIds } from '@/hooks/useRobotState';
import { useAuth } from '@/hooks/useAuth';
import Firebase_Manager from '@/services/Firebase_Manager';
import { EMOTION_TYPES } from '@/utils/emotionColors';
import Emotion_Manager from '@/services/Emotion_Manager';
import { useRobotStore } from '@/services/Robot_State_Manager';

export default function RoomsPage() {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const botIds = useRegisteredBotIds();

  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [roomNameError, setRoomNameError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [broadcastCmd, setBroadcastCmd] = useState('');
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const unsub = Firebase_Manager.listenToRooms(setRooms);
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    const unsub = Firebase_Manager.listenToRoomActivity(selectedRoom.id, setActivity);
    return unsub;
  }, [selectedRoom?.id]);

  const handleCreateRoom = async () => {
    const name = newRoomName.trim();
    if (!name || !/^[A-Za-z0-9_]{1,64}$/.test(name)) {
      setRoomNameError('Room name must be 1–64 alphanumeric characters or underscores');
      return;
    }
    if (rooms.some((r) => r.name === name)) {
      setRoomNameError('Room name already exists');
      return;
    }
    try {
      await Firebase_Manager.createRoom(name);
      setNewRoomName('');
      setRoomNameError('');
      showToast(`Room "${name}" created`, 'success');
    } catch (err) {
      showToast(`Failed to create room: ${err.message}`, 'error');
    }
  };

  const handleAddBot = async (roomId, botId) => {
    try {
      await Firebase_Manager.addBotToRoom(roomId, botId);
      showToast(`${botId} added to room`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveBot = async (roomId, botId) => {
    try {
      await Firebase_Manager.removeBotFromRoom(roomId, botId);
      showToast(`${botId} removed from room`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBroadcast = async () => {
    if (!selectedRoom || !broadcastCmd.trim()) return;
    try {
      await Firebase_Manager.sendRoomCommand(selectedRoom.id, broadcastCmd.trim(), currentUser?.uid);
      setBroadcastCmd('');
      showToast('Command broadcast to room', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleGroupEmotion = async (emotion) => {
    if (!selectedRoom) return;
    const members = Object.keys(selectedRoom.members ?? {});
    const robots = useRobotStore.getState().robots;
    await Promise.allSettled(
      members.map((botId) => {
        const ip = robots[botId]?.ip;
        if (!ip) return Promise.resolve();
        return Emotion_Manager.setEmotion(botId, emotion, `http://${ip}`);
      })
    );
    showToast(`Emotion ${emotion} sent to room`, 'success');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-screen-xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-white tracking-wider">Rooms</h1>

      {/* Create room */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Create Room</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => { setNewRoomName(e.target.value); setRoomNameError(''); }}
              placeholder="ROOM_ALPHA"
              className={`w-full bg-white/[0.05] border rounded-xl px-4 py-2.5 text-sm text-white
                placeholder-white/20 outline-none transition-colors
                ${roomNameError ? 'border-status-offline/60' : 'border-white/20 focus:border-accent-cyan/60'}`}
            />
            {roomNameError && <p className="text-xs text-status-offline mt-1">{roomNameError}</p>}
          </div>
          <NeonButton onClick={handleCreateRoom}>
            <Plus className="w-4 h-4" /> Create
          </NeonButton>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room list */}
        <div className="space-y-3">
          {rooms.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No rooms yet</p>
            </div>
          ) : (
            rooms.map((room) => (
              <GlassCard
                key={room.id}
                className={`p-4 cursor-pointer transition-all ${selectedRoom?.id === room.id ? 'border-accent-purple/60' : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{room.name}</p>
                    <p className="text-xs text-white/40">
                      {Object.keys(room.members ?? {}).length} bots
                    </p>
                  </div>
                  <Users className="w-4 h-4 text-white/30" />
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {/* Room detail */}
        {selectedRoom && (
          <div className="lg:col-span-2 space-y-4">
            <GlassCard className="p-5 space-y-4">
              <h3 className="font-bold text-white">{selectedRoom.name}</h3>

              {/* Members */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Members</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(selectedRoom.members ?? {}).map((botId) => (
                    <span key={botId} className="flex items-center gap-1.5 px-3 py-1 rounded-full
                      bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-xs">
                      {botId}
                      <button onClick={() => handleRemoveBot(selectedRoom.id, botId)}>
                        <Trash2 className="w-3 h-3 hover:text-status-offline" />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  onChange={(e) => { if (e.target.value) handleAddBot(selectedRoom.id, e.target.value); e.target.value = ''; }}
                  className="mt-2 bg-white/[0.05] border border-white/20 rounded-lg px-3 py-1.5
                    text-sm text-white outline-none"
                >
                  <option value="">+ Add bot…</option>
                  {botIds.filter((id) => !selectedRoom.members?.[id]).map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>

              {/* Broadcast command */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={broadcastCmd}
                  onChange={(e) => setBroadcastCmd(e.target.value)}
                  placeholder="Broadcast command…"
                  className="flex-1 bg-white/[0.05] border border-white/20 rounded-xl px-3 py-2
                    text-sm text-white placeholder-white/20 outline-none focus:border-accent-cyan/60"
                />
                <NeonButton onClick={handleBroadcast} disabled={!broadcastCmd.trim()}>
                  <Send className="w-4 h-4" />
                </NeonButton>
              </div>

              {/* Group emotion */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Group Emotion</p>
                <div className="flex flex-wrap gap-2">
                  {EMOTION_TYPES.map((e) => (
                    <NeonButton key={e} variant="purple" size="sm" onClick={() => handleGroupEmotion(e)}>
                      <Smile className="w-3.5 h-3.5" /> {e}
                    </NeonButton>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Activity feed */}
            <GlassCard className="p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Activity Feed</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activity.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-4">No activity yet</p>
                ) : (
                  activity.map((ev) => (
                    <div key={ev.id} className="flex gap-2 text-xs">
                      <span className="text-white/30 shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`${ev.type === 'command' ? 'text-accent-cyan' : 'text-white/70'}`}>
                        [{ev.type}] {ev.command ?? ev.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </motion.div>
  );
}
