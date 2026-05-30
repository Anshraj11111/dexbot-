/**
 * RGB_Controller — full RGB lighting control panel.
 * Requirements: 6.1–6.9
 */
import { useState, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/hooks/useToast';
import { useRobotState } from '@/hooks/useRobotState';
import { getApiClient } from '@/services/apiClient';
import { ColorWheel } from './ColorWheel';
import { BrightnessSlider } from './BrightnessSlider';
import { LightingModeButtons } from './LightingModeButtons';
import { HexColorInput } from './HexColorInput';

export function RGB_Controller({ botId }) {
  const robot = useRobotState(botId);
  const { showToast } = useToast();

  const [color, setColor] = useState('#FF00FF');
  const [brightness, setBrightness] = useState(128);
  const [mode, setMode] = useState(null);
  const lastGoodColor = useRef('#FF00FF');
  const lastGoodBrightness = useRef(128);

  const sendCommand = async (payload) => {
    if (!robot?.ip) return;
    try {
      const client = getApiClient(botId, `http://${robot.ip}`);
      await client.post('/api/command', payload);
      if (payload.rgb) lastGoodColor.current = payload.rgb;
      if (payload.brightness !== undefined) lastGoodBrightness.current = payload.brightness;
    } catch (err) {
      showToast(`RGB command failed: ${err.message}`, 'error');
      setColor(lastGoodColor.current);
      setBrightness(lastGoodBrightness.current);
    }
  };

  const handleColorChange = (hex) => {
    setColor(hex);
    sendCommand({ rgb: hex, brightness });
  };

  const handleBrightnessChange = (val) => {
    setBrightness(val);
    sendCommand({ rgb: color, brightness: val });
  };

  const handleModeSelect = (newMode) => {
    setMode(newMode);
    sendCommand({ mode: newMode });
  };

  return (
    <GlassCard className="p-5 space-y-5">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">RGB Lighting</h3>

      <div className="flex flex-col items-center gap-5">
        <ColorWheel value={color} onChange={handleColorChange} />
        <div className="w-full space-y-4">
          <HexColorInput value={color} onChange={handleColorChange} />
          <BrightnessSlider value={brightness} onChange={handleBrightnessChange} />
          <LightingModeButtons activeMode={mode} onModeSelect={handleModeSelect} />
        </div>
      </div>
    </GlassCard>
  );
}
