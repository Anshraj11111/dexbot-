/**
 * ColorWheel — HSL color picker on canvas.
 * Requirements: 6.1, 6.3
 */
import { useEffect, useRef, useCallback } from 'react';

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function ColorWheel({ value, onChange, size = 180 }) {
  const canvasRef = useRef(null);
  const isDragging = useRef(false);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2 - 4;

    ctx.clearRect(0, 0, size, size);

    // Draw hue ring
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, `hsl(${angle}, 0%, 100%)`);
      gradient.addColorStop(0.5, `hsl(${angle}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 20%)`);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw center white dot
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
  }, [size]);

  useEffect(() => { drawWheel(); }, [drawWheel]);

  const pickColor = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = size / 2, cy = size / 2;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > size / 2) return;

    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const saturation = Math.min(100, (dist / (size / 2)) * 100);
    const lightness = 50 - saturation * 0.25;
    const hex = hslToHex(angle, saturation, Math.max(20, lightness));
    onChange(hex);
  }, [size, onChange]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full cursor-crosshair"
        style={{ boxShadow: `0 0 20px ${value ?? '#a855f7'}40` }}
        onMouseDown={(e) => { isDragging.current = true; pickColor(e); }}
        onMouseMove={(e) => { if (isDragging.current) pickColor(e); }}
        onMouseUp={() => { isDragging.current = false; }}
        onMouseLeave={() => { isDragging.current = false; }}
        onTouchStart={(e) => { isDragging.current = true; pickColor(e); }}
        onTouchMove={(e) => { if (isDragging.current) pickColor(e); }}
        onTouchEnd={() => { isDragging.current = false; }}
      />
      {/* Selected color preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-white/20"
          style={{ backgroundColor: value ?? '#ffffff', boxShadow: `0 0 10px ${value ?? '#ffffff'}60` }}
        />
        <span className="text-xs font-mono text-white/60">{value ?? '#ffffff'}</span>
      </div>
    </div>
  );
}
