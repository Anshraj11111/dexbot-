/**
 * MessageInput — message compose box with broadcast support.
 * Requirements: 7.2, 7.7
 */
import { useState } from 'react';
import { Send, Radio } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

export function MessageInput({ onSend, onBroadcast, disabled }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || text.length > 500) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-white/10 space-y-2">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (1–500 chars)"
          maxLength={500}
          rows={2}
          disabled={disabled}
          className="flex-1 bg-white/[0.05] border border-white/20 rounded-xl px-3 py-2
            text-sm text-white placeholder-white/20 outline-none resize-none
            focus:border-accent-cyan/60 transition-colors disabled:opacity-40"
        />
        <div className="flex flex-col gap-1.5">
          <NeonButton
            onClick={handleSend}
            disabled={disabled || !text.trim() || text.length > 500}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </NeonButton>
          <NeonButton
            variant="purple"
            onClick={() => onBroadcast?.(text.trim())}
            disabled={disabled || !text.trim()}
            size="sm"
            title="Broadcast to all"
          >
            <Radio className="w-4 h-4" />
          </NeonButton>
        </div>
      </div>
      <div className="flex justify-between text-xs text-white/20">
        <span>Enter to send · Shift+Enter for newline</span>
        <span className={text.length > 450 ? 'text-yellow-400' : ''}>{text.length}/500</span>
      </div>
    </div>
  );
}
