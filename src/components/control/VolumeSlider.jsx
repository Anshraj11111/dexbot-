/**
 * VolumeSlider — 0-100 volume control.
 * Requirements: 4.4
 */
import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { getApiClient } from '@/services/apiClient';
import { useRobotState } from '@/hooks/useRobotState';

export function VolumeSlider({ botId }) {
  const robot = useRobotState(botId);
  const [volume, setVolume] = useState(50);

  const handleRelease = async () => {
    if (!robot?.ip) return;
    try {
      const client = getApiClient(botId, `http://${robot.ip}`);
      await client.post('/api/command', { command: 'set_volume', value: volume });
    } catch {
      // Silent fail — toast handled by interceptor if needed
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider">
          <Volume2 className="w-3.5 h-3.5" /> Volume
        </label>
        <span className="text-xs font-mono text-white/60">{volume}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        onMouseUp={handleRelease}
        onTouchEnd={handleRelease}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          bg-white/10
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent-purple
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white/30"
      />
    </div>
  );
}
