import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Send, Sparkles, Search, Mic, Map, X, MessageSquare } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import LibraryWayfinder from '../components/LibraryWayfinder';
import UniversityHeader from '../components/UniversityHeader';
import VoiceOrb from '../components/VoiceOrb';
import StatusIndicator from '../components/StatusIndicator';
import ChatBubble from '../components/ChatBubble';
import Waveform from '../components/Waveform';
import BookSearch from '../components/BookSearch';
import { useToast } from '../components/Toast';
import { sendChat } from '../api/client';

import stateManager, { State } from '../voice/ConversationStateManager';
import ttsManager from '../voice/SpeechSynthesisManager';
import sttManager from '../voice/SpeechRecognitionManager';

// INTRO inlined to fix Vite minifier bug

const VoiceAssistant = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [conversationState, setConversationState] = useState(State.IDLE);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AI Library Assistant. I can help you find books, navigate to library sections, and answer questions about the university. Just tap the orb or type below!", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [routeTo, setRouteTo] = useState(null);
  const [hasIntroduced, setHasIntroduced] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'map', or 'search'
  
  const messagesEndRef = useRef(null);
  const analyserRef = useRef(null);
  const wayfindRef = useRef(null);
  const inputRef = useRef(null);
  const rightPanelRef = useRef(null);

  // 3D Parallax effect removed for scrolling performance

  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      setConversationState(newState);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  useEffect(() => {
    sttManager.onTranscription((text) => {
      if (text && text.trim()) {
        handleVoiceInput(text.trim());
      } else {
        stateManager.setState(State.IDLE);
        showToast("I didn't hear anything. Try again?", 'info');
      }
    });

    sttManager.onError((errorMsg) => {
      stateManager.setState(State.IDLE);
      showToast(errorMsg, 'error');
    });

    return () => {
      ttsManager.cancel();
      sttManager.stopListening();
      stateManager.reset();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); handleOrbClick(); }
      else if (e.code === 'Escape') { e.preventDefault(); handleInterrupt(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversationState, hasIntroduced]);

  const handleLogout = () => {
    ttsManager.cancel();
    sttManager.stopListening();
    stateManager.reset();
    logoutUser();
    navigate('/login');
  };

  const handleOrbClick = useCallback(() => {
    const currentState = stateManager.getState();
    if (currentState === State.SPEAKING || currentState === State.INTRODUCING) { 
      handleInterrupt(); 
      startListening();
      return; 
    }
    if (currentState === State.LISTENING) { sttManager.stopListening(); stateManager.setState(State.IDLE); return; }
    if (currentState === State.PROCESSING || currentState === State.RETRIEVING || currentState === State.GENERATING) return;
    if (!hasIntroduced) { startIntroduction(); } else { startListening(); }
  }, [hasIntroduced, conversationState]);

  const handleInterrupt = useCallback(() => {
    ttsManager.cancel();
    sttManager.stopListening();
    stateManager.reset();
  }, []);

  const startIntroduction = useCallback(() => {
    if (!stateManager.setState(State.INTRODUCING)) return;
    
    setHasIntroduced(true);
    const introText = "Hello! I'm your AI Library Assistant. I can help you find books, navigate to library sections, and answer questions about the university. Just tap the orb or type below!";
    
    ttsManager.speak(introText, () => {
      if (stateManager.getState() === State.INTRODUCING) {
        startListening();
      }
    });
  }, []);

  const startListening = useCallback(() => {
    ttsManager.cancel();
    if (!stateManager.setState(State.LISTENING)) return;
    sttManager.startListening();
    setTimeout(() => {
      if (sttManager.analyser) analyserRef.current = sttManager.analyser;
    }, 200);
  }, []);

  const handleVoiceInput = useCallback(async (text) => {
    stateManager.setState(State.PROCESSING);
    setMessages(prev => {
      const history = [...prev];
      setTimeout(() => {
        stateManager.setState(State.RETRIEVING);
        streamAIResponse(text, history);
      }, 0);
      return [...prev, { role: 'user', content: text, timestamp: Date.now() }];
    });
  }, []);

  const handleSpeakAgain = useCallback((text) => {
    handleInterrupt();
    stateManager.setState(State.SPEAKING);
    ttsManager.speak(text, () => {
      stateManager.reset();
    });
  }, [handleInterrupt]);

  const streamAIResponse = useCallback(async (queryText, history = [], isTextOnly = false) => {
    try {
      const recentHistory = history.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const response = await sendChat({ message: queryText, history: recentHistory });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      stateManager.setState(State.GENERATING);
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let fullResponse = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: fullResponse };
            return newMessages;
          });
        }
      }

      const routeMatch = fullResponse.match(/<ROUTE_TO:([A-Z0-9]+)>/i);
      if (routeMatch) {
        const rackCode = routeMatch[1];
        setRouteTo(rackCode);
        fullResponse = fullResponse.replace(/<ROUTE_TO:[A-Z0-9]+>/ig, '').trim();
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: fullResponse, hasRoute: true };
          return newMessages;
        });
        showToast(`Routing to Rack ${rackCode}`, 'success');
        setActiveTab('map'); // Automatically show map on route
      }

      if (fullResponse.trim()) {
        if (!isTextOnly) {
          stateManager.setState(State.SPEAKING);
          ttsManager.speak(fullResponse, () => {
            setTimeout(() => {
              if (stateManager.getState() === State.SPEAKING) startListening();
            }, 400);
          });
        } else {
          stateManager.reset();
        }
      } else {
        stateManager.reset();
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errMsg = `Backend Connection Failed: Ensure your Python server is running and Groq API key is valid. (${error.message})`;
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }]);
      showToast('Backend Error. Check terminal logs.', 'error');
      stateManager.reset();
    }
  }, []);

  const handleTextSend = async (e) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text) return;
    handleInterrupt();
    setInput('');
    setMessages(prev => {
      const history = [...prev];
      setTimeout(async () => {
        stateManager.setState(State.RETRIEVING);
        setActiveTab('chat');
        await streamAIResponse(text, history, true);
      }, 0);
      return [...prev, { role: 'user', content: text, timestamp: Date.now() }];
    });
  };

  const handleRackClick = useCallback((rackCode) => {
    const text = `Route to Rack ${rackCode}`;
    setMessages(prev => {
      const history = [...prev];
      setTimeout(() => {
        stateManager.setState(State.RETRIEVING);
        setActiveTab('chat');
        streamAIResponse(text, history, true);
      }, 0);
      return [...prev, { role: 'user', content: text, timestamp: Date.now() }];
    });
  }, [streamAIResponse]);

  const isActive = conversationState !== State.IDLE;
  const isListeningState = conversationState === State.LISTENING;

  return (
    <div className="flex flex-col h-screen bg-[#05070a] text-white overflow-hidden relative selection:bg-purple-500/30">
      <AnimatedBackground />
      
      {/* Header */}
      <header className="glass flex items-center justify-between px-5 py-2.5 z-20 relative border-b border-white/5 shadow-2xl" role="banner">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-white/10">
            <Sparkles size={15} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-base font-bold tracking-tight">
            Library <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI</span>
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs border border-white/10 shadow-inner">
            <User size={12} className="text-blue-300" />
            <span className="font-semibold text-gray-200">{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all shadow-sm">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content: Left Orb, Right Chat/Map */}
      <div className="flex-1 flex overflow-hidden relative z-10 w-full max-w-7xl mx-auto">
        
        {/* LEFT PANEL: Voice Orb Centered */}
        <div className="w-1/2 flex flex-col items-center justify-center relative">
          <div className="relative z-10 scale-125 hover:scale-150 transition-transform duration-700 ease-out">
            <VoiceOrb state={conversationState} onClick={handleOrbClick} />
          </div>
          
          <div className="mt-12 z-10 glass-card px-4 py-2 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <StatusIndicator state={conversationState} />
          </div>
        </div>

        {/* RIGHT PANEL: Chat or Map */}
        <div className="w-1/2 flex flex-col p-6 pl-0 h-full">
          
          <div 
            ref={rightPanelRef}
            className="w-full flex-1 glass-card rounded-3xl flex flex-col overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 transition-transform duration-300 ease-out"
          >
            {/* Panel Header toggles */}
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-md">
              <UniversityHeader isRouting={activeTab === 'map' && routeTo !== null} />
              
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 shadow-inner">
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'chat' ? 'bg-blue-600/30 text-blue-300 shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <MessageSquare size={14} /> Chat
                </button>
                <button 
                  onClick={() => setActiveTab('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'map' ? 'bg-purple-600/30 text-purple-300 shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <Map size={14} /> Map
                </button>
                <button 
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'search' ? 'bg-emerald-600/30 text-emerald-300 shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <Search size={14} /> Search
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 relative overflow-hidden">
              
              {/* CHAT VIEW */}
              <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab !== 'chat' ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}`}>
                <div 
                  className="flex-1 overflow-y-auto p-5 scroll-smooth overscroll-contain" 
                  role="log"
                  style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}
                >
                  {messages.map((msg, idx) => (
                    <ChatBubble 
                      key={idx} 
                      message={msg} 
                      onSpeak={msg.role === 'assistant' ? handleSpeakAgain : undefined}
                      hasRoute={msg.hasRoute}
                      isSpeaking={conversationState === State.SPEAKING || conversationState === State.INTRODUCING}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Search Input inside Chat */}
                <div className="p-4 bg-gradient-to-t from-black/80 to-transparent relative z-20">
                  <form onSubmit={handleTextSend} className="flex gap-2">
                    <div className="relative flex-1 group">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Talk to assistant..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all shadow-inner"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={!input.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-2xl px-5 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>

              {/* MAP VIEW */}
              <div className={`absolute inset-0 flex flex-col bg-black/40 transition-opacity duration-300 ${activeTab !== 'map' ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}`}>
                <div className="flex-1 relative">
                  <LibraryWayfinder 
                    ref={wayfindRef}
                    routeTo={routeTo} 
                    onRackClick={handleRackClick}
                    activeFloor="both" // Hardcoded to both floors since we removed floor controls
                  />
                  
                  {/* Close Map button floating over map */}
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all shadow-xl"
                  >
                    <X size={16} />
                  </button>

                  <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-xs text-gray-300 font-medium text-center shadow-lg">
                      {routeTo ? `Showing route to Rack ${routeTo}` : 'Interactive 3D Library Map. Drag to orbit.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* SEARCH VIEW */}
              <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab !== 'search' ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}`}>
                <BookSearch onShowOnMap={(rack) => {
                  setRouteTo(rack);
                  setActiveTab('map');
                  showToast(`Showing Rack ${rack} on map`, 'success');
                }} />
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VoiceAssistant;
