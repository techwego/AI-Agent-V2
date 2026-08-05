import React, { useState } from 'react';
import { User, Sparkles, Copy, Check, Volume2, MapPin } from 'lucide-react';

const ChatBubble = ({ message, onSpeak, hasRoute }) => {
  const isUser = message.role === 'user';
  const { content, timestamp } = message;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-5 animate-[slide-up-fade_0.4s_ease-out]`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2.5`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600/40 border border-blue-400/25' : 'bg-purple-600/40 border border-purple-400/25'
        }`}>
          {isUser ? <User size={13} className="text-blue-200" /> : <Sparkles size={13} className="text-purple-200" />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl border ${
            isUser 
              ? 'bg-blue-900/40 border-blue-500/15 text-blue-50 rounded-br-sm' 
              : 'bg-white/[0.05] border-white/[0.06] text-gray-200 rounded-bl-sm'
          } shadow-lg relative group`}>
            {content ? (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{content}</div>
            ) : (
              <div className="flex space-x-1.5 items-center h-5 px-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            )}

            {/* Action buttons for AI messages */}
            {!isUser && content && (
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-300"
                  title="Copy"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
                {onSpeak && (
                  <button 
                    onClick={() => onSpeak(content)}
                    className="p-1 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-300"
                    title="Speak Again"
                  >
                    <Volume2 size={12} />
                  </button>
                )}
                {hasRoute && (
                  <span className="flex items-center gap-1 text-[9px] text-amber-400/70 ml-1">
                    <MapPin size={9} /> Route shown on map
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          {timestamp && (
            <span className="text-[10px] text-gray-600 mt-1 px-1">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
