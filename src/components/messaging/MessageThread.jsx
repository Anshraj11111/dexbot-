/**
 * MessageThread — conversation message list.
 * Requirements: 7.3, 7.4, 7.5
 */
import { useEffect, useRef } from 'react';
import { formatTimestamp } from '@/utils/formatTimestamp';

export function MessageThread({ messages, currentBotId, isTyping }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
      {messages.length === 0 && (
        <p className="text-center text-white/20 text-sm py-8">No messages yet</p>
      )}
      {messages.map((msg) => {
        const isMine = msg.from === currentBotId;
        return (
          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] space-y-1`}>
              {!isMine && (
                <p className="text-xs text-white/40 px-1">{msg.from}</p>
              )}
              <div className={`px-4 py-2.5 rounded-2xl text-sm
                ${isMine
                  ? 'bg-accent-purple/30 border border-accent-purple/40 text-white rounded-br-sm'
                  : 'bg-white/[0.08] border border-white/10 text-white/90 rounded-bl-sm'
                }`}>
                {msg.text}
              </div>
              <p className={`text-xs text-white/30 px-1 ${isMine ? 'text-right' : ''}`}>
                {formatTimestamp(msg.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-white/[0.08] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5">
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
