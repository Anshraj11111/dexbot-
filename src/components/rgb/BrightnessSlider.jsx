/**
 * BrightnessSlider — 0-255 brightness control.
 * Requirements: 6.2, 6.3
 */
import { useState } from 'react';
import { Sun } from 'lucide-react';

export function BrightnessSlider({ value, onChange }) {
  const [local, setLocal] = useState(value ?? 128);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider">
          <Sun className="w-3.5 h-3.5" /> Brightness
        </label>
        <span className="text-xs font-mono text-white/60">{local}</span>
      </div>
      <input
        type="range"
        min={0}
        max={255}
        step={1}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onMouseUp={() => onChange(local)}
        onTouchEnd={() => onChange(local)}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          bg-gradient-to-r from-black to-white
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent-cyan
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white/30"
      />
    </div>
  );
}
