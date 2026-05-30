/**
 * EmotionPanel — full emotion control panel for a robot.
 * Requirements: 5.1–5.7
 */
import { GlassCard } from '@/components/ui/GlassCard';
import { useRobotState } from '@/hooks/useRobotState';
import { useToast } from '@/hooks/useToast';
import { useRobotStore } from '@/services/Robot_State_Manager';
import Emotion_Manager from '@/services/Emotion_Manager';
import { EmotionButton } from './EmotionButton';
import { EmotionFacePreview } from './EmotionFacePreview';
import { EmotionColorSwatch } from './EmotionColorSwatch';
import { EMOTION_TYPES } from '@/utils/emotionColors';

export function EmotionPanel({ botId }) {
  const robot = useRobotState(botId);
  const { showToast } = useToast();
  const currentEmotion = robot?.emotion ?? 'NEUTRAL';
  const isPending = robot?.emotionPending ?? false;
  const baseURL = robot?.ip ? `http://${robot.ip}` : null;

  const handleEmotionClick = async (emotion) => {
    if (!baseURL) {
      showToast('Robot IP not configured', 'error');
      return;
    }
    try {
      await Emotion_Manager.setEmotion(botId, emotion, baseURL);
    } catch (err) {
      showToast(`Failed to set emotion: ${err?.message ?? 'Unknown error'}`, 'error');
    }
  };

  return (
    <GlassCard className="p-5 space-y-5">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Emotion Control</h3>

      {/* Face preview + color swatch */}
      <div className="flex items-center gap-6">
        <EmotionFacePreview emotion={currentEmotion} />
        <div className="space-y-2">
          <p className="text-xs text-white/40">Active Emotion</p>
          <p className="text-lg font-bold text-white">{currentEmotion}</p>
          <EmotionColorSwatch emotion={currentEmotion} />
        </div>
      </div>

      {/* Emotion buttons grid */}
      <div className="grid grid-cols-3 gap-2">
        {EMOTION_TYPES.map((emotion) => (
          <EmotionButton
            key={emotion}
            emotion={emotion}
            isActive={currentEmotion === emotion}
            isDisabled={isPending}
            onClick={handleEmotionClick}
          />
        ))}
      </div>

      {isPending && (
        <p className="text-xs text-accent-cyan text-center animate-pulse">Sending emotion…</p>
      )}
    </GlassCard>
  );
}
