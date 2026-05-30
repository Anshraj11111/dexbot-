/**
 * CommandInput — send arbitrary commands to a robot.
 * Requirements: 4.3
 */
import { useState } from 'react';
import { Send } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { getApiClient } from '@/services/apiClient';
import { useRobotState } from '@/hooks/useRobotState';

export function CommandInput({ botId }) {
  const robot = useRobotState(botId);
  const [command, setCommand] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!command.trim() || !robot?.ip) return;
    setLoading(true);
    try {
      const client = getApiClient(botId, `http://${robot.ip}`);
      const res = await client.post('/api/command', { command: command.trim() });
      setFeedback({ type: 'success', text: JSON.stringify(res.data) });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message ?? 'Command failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="e.g. restart, play_sound, set_volume:80"
          className="flex-1 bg-white/[0.05] border border-white/20 rounded-xl px-4 py-2.5
            text-sm text-white placeholder-white/20 outline-none focus:border-accent-cyan/60 transition-colors"
        />
        <NeonButton type="submit" disabled={loading || !command.trim()} size="md">
          <Send className="w-4 h-4" />
        </NeonButton>
      </form>
      {feedback && (
        <div className={`text-xs rounded-lg px-3 py-2 font-mono
          ${feedback.type === 'success'
            ? 'bg-status-online/10 border border-status-online/20 text-status-online'
            : 'bg-status-offline/10 border border-status-offline/20 text-status-offline'
          }`}>
          {feedback.text}
        </div>
      )}
    </div>
  );
}
