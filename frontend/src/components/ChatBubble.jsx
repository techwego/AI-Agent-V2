import React, { useState } from 'react';
import { User, Sparkles, Copy, Check, Volume2, MapPin } from 'lucide-react';

const ChatBubble = ({ message, onSpeak, hasRoute, isSpeaking }) => {
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
          isUser ? 'bg-blue-100 border border-blue-200' : 'bg-purple-100 border border-purple-200'
        }`}>
          {isUser ? <User size={13} className="text-blue-600" /> : <Sparkles size={13} className="text-purple-600" />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl border ${
            isUser 
              ? 'bg-blue-600 border-blue-500 text-white rounded-br-sm' 
              : 'bg-white border-gray-200 text-gray-700 rounded-bl-sm shadow-sm'
          } relative group`}>
            {content && content.trim() ? (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{content.trim()}</div>
            ) : (
              <div className="flex space-x-1.5 items-center h-5 px-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            )}

            {/* Action buttons for AI messages */}
            {!isUser && content && (
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  title="Copy"
                >
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                </button>
                {onSpeak && (
                  <button 
                    onClick={() => onSpeak(content)}
                    disabled={isSpeaking}
                    className={`p-1 rounded transition-colors ${isSpeaking ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                    title={isSpeaking ? "Agent is currently speaking" : "Speak Again"}
                  >
                    <Volume2 size={12} />
                  </button>
                )}
                {hasRoute && (
                  <span className="flex items-center gap-1 text-[9px] text-amber-500 ml-1">
                    <MapPin size={9} /> Route shown on map
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          {timestamp && (
            <span className="text-[10px] text-gray-400 mt-1 px-1">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
