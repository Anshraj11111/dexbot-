/**
 * HexColorInput — validated hex color text input.
 * Requirements: 6.6, 6.7, 6.8
 */
import { useState } from 'react';
import { validateHexColor } from '@/utils/hexColorValidator';

export function HexColorInput({ value, onChange }) {
  const [input, setInput] = useState(value ?? '');
  const [error, setError] = useState('');

  const commit = () => {
    const result = validateHexColor(input);
    if (result.valid) {
      setError('');
      const hex = input.startsWith('#') ? input : `#${input}`;
      onChange(hex);
    } else {
      setError(result.error);
    }
  };

  return (
    <div>
      <label className="block text-xs text-white/40 mb-1 uppercase tracking-wider">HEX Color</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          placeholder="#FF00FF"
          maxLength={7}
          className={`flex-1 bg-white/[0.05] border rounded-lg px-3 py-2 text-sm font-mono text-white
            placeholder-white/20 outline-none transition-colors
            ${error ? 'border-status-offline/60' : 'border-white/20 focus:border-accent-cyan/60'}`}
        />
        <div
          className="w-10 h-10 rounded-lg border border-white/20 shrink-0"
          style={{ backgroundColor: error ? 'transparent' : (input.startsWith('#') ? input : `#${input}`) }}
        />
      </div>
      {error && <p className="text-xs text-status-offline mt-1">{error}</p>}
    </div>
  );
}
