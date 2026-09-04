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
        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20 ${
          isUser 
            ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/20' 
            : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/20'
        }`}>
          {isUser ? <User size={14} /> : <Sparkles size={14} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-5 py-4 rounded-[22px] border relative group transition-all ${
            isUser 
              ? 'bg-gradient-to-r from-sky-600 to-blue-600 border-sky-400/40 text-white rounded-br-sm shadow-lg shadow-sky-950/40' 
              : 'bg-slate-900/85 backdrop-blur-xl border-slate-700/80 text-slate-100 rounded-bl-sm shadow-xl shadow-black/40'
          }`}>
            {content && content.trim() ? (
              <div className="whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed font-normal">{content.trim()}</div>
            ) : (
              <div className="flex space-x-1.5 items-center h-5 px-2">
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></div>
              </div>
            )}

            {/* Action buttons for Assistant messages */}
            {!isUser && content && (
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-700/60 opacity-70 group-hover:opacity-100 transition-all duration-200">
                <button 
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                  title="Copy response"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                
                {onSpeak && (
                  <button 
                    onClick={() => onSpeak(content)}
                    disabled={isSpeaking}
                    className={`p-1.5 rounded-lg transition-all ${
                      isSpeaking 
                        ? 'opacity-30 cursor-not-allowed text-slate-500' 
                        : 'hover:bg-slate-800 text-slate-400 hover:text-sky-300'
                    }`}
                    title={isSpeaking ? "Agent is currently speaking" : "Speak Again"}
                  >
                    <Volume2 size={13} />
                  </button>
                )}

                {hasRoute && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 px-2.5 py-0.5 bg-amber-950/60 rounded-lg border border-amber-500/40 shadow-sm font-mono">
                    <MapPin size={10} className="text-amber-400" /> 3D ROUTE READY
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          {timestamp && (
            <span className="text-[10px] text-slate-500 mt-1.5 px-1 font-mono">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
