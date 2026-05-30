/**
 * WifiPanel — WiFi status display.
 * Requirements: 4.8
 */
import { Wifi, WifiOff } from 'lucide-react';

export function WifiPanel({ wifiData }) {
  if (!wifiData) {
    return (
      <div className="flex items-center gap-2 text-white/30 text-sm">
        <WifiOff className="w-4 h-4" />
        <span>WiFi data unavailable</span>
      </div>
    );
  }

  const { ssid, rssi, connected, ip } = wifiData;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Wifi className={`w-4 h-4 ${connected ? 'text-status-online' : 'text-status-offline'}`} />
        <span className="text-sm font-medium text-white">{ssid || '—'}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${connected
          ? 'bg-status-online/10 text-status-online border border-status-online/30'
          : 'bg-status-offline/10 text-status-offline border border-status-offline/30'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="flex gap-4 text-xs text-white/40">
        <span>RSSI: <span className="text-white/70">{rssi} dBm</span></span>
        <span>IP: <span className="text-white/70 font-mono">{ip}</span></span>
      </div>
    </div>
  );
}
