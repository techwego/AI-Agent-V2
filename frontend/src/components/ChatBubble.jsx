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
        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-md ring-2 ring-white ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
        }`}>
          {isUser ? <User size={14} /> : <Sparkles size={14} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl border relative group ${
            isUser 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500/50 text-white rounded-br-md shadow-sm' 
              : 'bg-white border-slate-200/80 text-slate-700 rounded-bl-md shadow-sm'
          }`}>
            {content && content.trim() ? (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed font-medium">{content.trim()}</div>
            ) : (
              <div className="flex space-x-1.5 items-center h-5 px-2">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
              </div>
            )}

            {/* Action buttons for AI messages */}
            {!isUser && content && (
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100/80 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button 
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600"
                  title="Copy"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
                {onSpeak && (
                  <button 
                    onClick={() => onSpeak(content)}
                    disabled={isSpeaking}
                    className={`p-1.5 rounded-lg transition-all ${
                      isSpeaking 
                        ? 'opacity-30 cursor-not-allowed' 
                        : 'hover:bg-blue-50 text-slate-400 hover:text-blue-600'
                    }`}
                    title={isSpeaking ? "Agent is currently speaking" : "Speak Again"}
                  >
                    <Volume2 size={12} />
                  </button>
                )}
                {hasRoute && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 ml-1 px-2 py-0.5 bg-amber-50 rounded-lg border border-amber-200/50">
                    <MapPin size={9} /> Route on map
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          {timestamp && (
            <span className="text-[10px] text-slate-400 mt-1.5 px-1 font-semibold">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
