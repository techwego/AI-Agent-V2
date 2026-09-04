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
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-5 animate-[slideUpFade_0.35s_ease-out]`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2.5`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-md ring-2 ring-white ${
          isUser 
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-600/20' 
            : 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-violet-600/20'
        }`}>
          {isUser ? <User size={14} /> : <Sparkles size={14} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-5 py-4 rounded-[22px] border relative group transition-all ${
            isUser 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500/50 text-white rounded-br-xs shadow-sm' 
              : 'bg-white border-slate-200/90 text-slate-800 rounded-bl-xs shadow-sm'
          }`}>
            {content && content.trim() ? (
              <div className="whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed font-medium">{content.trim()}</div>
            ) : (
              <div className="flex space-x-1.5 items-center h-5 px-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
            )}

            {/* Action buttons for Assistant messages */}
            {!isUser && content && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 opacity-70 group-hover:opacity-100 transition-all duration-200">
                <button 
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                  title="Copy response"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
                
                {onSpeak && (
                  <button 
                    onClick={() => onSpeak(content)}
                    disabled={isSpeaking}
                    className={`p-1.5 rounded-lg transition-all ${
                      isSpeaking 
                        ? 'opacity-30 cursor-not-allowed text-slate-400' 
                        : 'hover:bg-blue-50 text-slate-400 hover:text-blue-600'
                    }`}
                    title={isSpeaking ? "Agent is currently speaking" : "Speak Again"}
                  >
                    <Volume2 size={13} />
                  </button>
                )}

                {hasRoute && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 px-2.5 py-0.5 bg-amber-50 rounded-lg border border-amber-200 shadow-xs font-mono">
                    <MapPin size={10} className="text-amber-600" /> 3D ROUTE READY
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          {timestamp && (
            <span className="text-[10px] text-slate-400 mt-1.5 px-1 font-mono">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
