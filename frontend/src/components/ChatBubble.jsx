import React, { useState } from 'react';
import { User, Sparkles, Copy, Check, Volume2, MapPin, Navigation, Compass } from 'lucide-react';

const ChatBubble = ({ message, onSpeak, hasRoute, isSpeaking, onShowRoute }) => {
  const isUser = message.role === 'user';
  const { content, timestamp } = message;
  const [copied, setCopied] = useState(false);

  // Extract route tag or rack name
  const routeMatch = content?.match(/<ROUTE_FROM:([^>]+)_TO:([^>]+)>/i) || content?.match(/<ROUTE_TO:([^>]+)>/i);
  const rackMatch = content?.match(/(?:Rack|Shelf)\s*([A-Z0-9\-]+)/i);
  const targetRack = message.routeTarget || (routeMatch ? (routeMatch[2] || routeMatch[1]) : (rackMatch ? rackMatch[1] : null));
  const cleanContent = content ? content.replace(/<ROUTE_[^>]+>/gi, '').trim() : '';

  const handleCopy = () => {
    if (cleanContent) {
      navigator.clipboard.writeText(cleanContent).then(() => {
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
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500/50 text-white rounded-br-xs shadow-md' 
              : 'bg-slate-850/90 backdrop-blur-xl border-slate-700/80 text-slate-100 rounded-bl-xs shadow-md'
          }`}>
            {cleanContent ? (
              <div className="whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed font-medium">{cleanContent}</div>
            ) : (
              <div className="flex space-x-1.5 items-center h-5 px-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              </div>
            )}

            {/* Action buttons for Assistant messages */}
            {!isUser && cleanContent && (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-700/60">
                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-all duration-200">
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:bg-slate-750 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    title="Copy response"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                  
                  {onSpeak && (
                    <button 
                      onClick={() => onSpeak(cleanContent)}
                      disabled={isSpeaking}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        isSpeaking 
                          ? 'opacity-30 cursor-not-allowed text-slate-500' 
                          : 'hover:bg-blue-950/70 text-slate-400 hover:text-blue-300'
                      }`}
                      title={isSpeaking ? "Agent is currently speaking" : "Speak Again"}
                    >
                      <Volume2 size={13} />
                    </button>
                  )}
                </div>

                {/* Direct 3D Path Navigation Button */}
                {(hasRoute || targetRack) && onShowRoute && (
                  <button
                    onClick={() => onShowRoute(targetRack || 'entrance')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
                    title="Show direct walking path on 3D Map"
                  >
                    <Compass size={13} className="text-cyan-300 animate-spin-slow" />
                    <span>View 3D Path</span>
                  </button>
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
