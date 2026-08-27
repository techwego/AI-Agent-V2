import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, User, Send, Sparkles, Search, Mic, Map, X, MessageSquare, 
  Maximize2, Minimize2, Compass, Layers, Navigation, ArrowRight, CornerDownRight, MicOff 
} from 'lucide-react';
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

const VoiceAssistant = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [conversationState, setConversationState] = useState(State.IDLE);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AI Library Assistant. I can help you find books, navigate to library sections, and answer questions about the university. Just tap the orb or type below!", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [fsInput, setFsInput] = useState('');
  const [routeFrom, setRouteFrom] = useState('entrance');
  const [routeTo, setRouteTo] = useState(null);
  const [hasIntroduced, setHasIntroduced] = useState(false);
  const hasIntroducedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'map', or 'search'
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeFloor, setActiveFloor] = useState('both');
  const [totalFloors, setTotalFloors] = useState(2);
  const [routeSteps, setRouteSteps] = useState([]);
  
  const messagesEndRef = useRef(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const analyserRef = useRef(null);
  const wayfindRef = useRef(null);
  const inputRef = useRef(null);
  const rightPanelRef = useRef(null);

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
        showToast("I didn't hear anything. Try speaking again.", 'info');
      }
    });

    sttManager.onError((errorMsg) => {
      stateManager.setState(State.IDLE);
      showToast(errorMsg, 'error');
    });

    return () => {
      sttManager.onTranscription(() => {});
      sttManager.onError(() => {});
      ttsManager.cancel();
      sttManager.stopListening();
      stateManager.reset();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
      if (e.code === 'Space') { 
        e.preventDefault(); 
        handleOrbClick(); 
      }
      else if (e.code === 'Escape') { 
        e.preventDefault(); 
        if (isMapFullscreen) {
          setIsMapFullscreen(false);
        } else {
          handleInterrupt();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversationState, hasIntroduced, isMapFullscreen]);

  const handleLogout = () => {
    ttsManager.cancel();
    sttManager.stopListening();
    stateManager.reset();
    logoutUser();
    navigate('/login');
  };

  const handleInterrupt = useCallback(() => {
    ttsManager.cancel();
    sttManager.stopListening();
    stateManager.reset();
  }, []);

  const startListening = useCallback(() => {
    ttsManager.cancel();
    if (!stateManager.setState(State.LISTENING)) return;
    sttManager.startListening();
    setTimeout(() => {
      if (sttManager.analyser) analyserRef.current = sttManager.analyser;
    }, 200);
  }, []);

  const handleOrbClick = useCallback(() => {
    const currentState = stateManager.getState();
    if (currentState === State.SPEAKING || currentState === State.INTRODUCING) { 
      handleInterrupt(); 
      return; 
    }
    if (currentState === State.LISTENING) { 
      sttManager.stopListening(); 
      stateManager.setState(State.IDLE); 
      return; 
    }
    if (currentState === State.PROCESSING || currentState === State.RETRIEVING || currentState === State.GENERATING) return;
    
    // First time click: Introduce herself via TTS
    if (!hasIntroducedRef.current && currentState === State.IDLE) {
      hasIntroducedRef.current = true;
      setHasIntroduced(true);

      const hour = new Date().getHours();
      let greeting = 'Good evening';
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 17) greeting = 'Good afternoon';
      
      const welcomeText = `${greeting}! I am Sam, your AI Library Assistant. How can I help you today?`;
      
      setMessages(prev => [...prev, { role: 'assistant', content: welcomeText, timestamp: Date.now() }]);
      stateManager.setState(State.INTRODUCING);
      
      ttsManager.speak(welcomeText, () => {
        if (stateManager.getState() === State.INTRODUCING) {
          stateManager.setState(State.IDLE);
        }
      });
      return;
    }
    
    // Subsequent clicks: Start listening to the user's voice
    startListening();
  }, [handleInterrupt, startListening]);

  const handleVoiceInput = useCallback(async (text) => {
    stateManager.setState(State.PROCESSING);
    const history = [...messagesRef.current];
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: Date.now() }]);
    setTimeout(() => {
      stateManager.setState(State.RETRIEVING);
      streamAIResponse(text, history);
    }, 0);
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
          const displayResponse = fullResponse.replace(/<ROUTE_[^>]*>?/gi, '');
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: displayResponse };
            return newMessages;
          });
        }
      }

      const routeMatch = fullResponse.match(/<ROUTE_FROM:(.*?)_TO:(.*?)>/i);
      const fallbackRouteMatch = fullResponse.match(/<ROUTE_TO:(.*?)>/i);

      if (routeMatch || fallbackRouteMatch) {
        let currentRackCode = '';
        let isValid = true;
        if (routeMatch) {
          const fromNode = routeMatch[1];
          currentRackCode = routeMatch[2];
          if (['A', 'start_node', 'Y', 'unknown'].includes(fromNode.toLowerCase()) || ['B', 'unknown', 'X'].includes(currentRackCode.toLowerCase())) {
            isValid = false;
          }
          if (isValid) {
            setRouteFrom(fromNode);
            setRouteTo(currentRackCode);
          }
        } else {
          currentRackCode = fallbackRouteMatch[1];
          if (['B', 'unknown', 'X'].includes(currentRackCode.toLowerCase())) {
            isValid = false;
          }
          if (isValid) setRouteTo(currentRackCode);
        }
        
        fullResponse = fullResponse.replace(/<ROUTE_[^>]+>/ig, '').trim();
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: fullResponse, hasRoute: isValid };
          return newMessages;
        });
        
        if (isValid) {
          showToast(`Opening Navigation to Rack ${currentRackCode}`, 'success');
          setActiveTab('map');
          setIsMapFullscreen(true); // Open in full screen for better view and interaction!
        }
      }

      if (fullResponse.trim()) {
        if (!isTextOnly) {
          stateManager.setState(State.SPEAKING);
          ttsManager.speak(fullResponse, () => {
            stateManager.reset();
          });
        } else {
          stateManager.reset();
        }
      } else {
        setMessages(prev => prev.filter((msg, i) => i !== prev.length - 1 || msg.content.trim() !== ''));
        stateManager.reset();
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errMsg = `Backend Connection Failed: Ensure your Python server is running and Groq API key is valid. (${error.message})`;
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }]);
      showToast('Backend Error. Check terminal logs.', 'error');
      stateManager.reset();
    }
  }, [showToast]);

  const handleTextSend = async (e, customText = null) => {
    if (e) e.preventDefault();
    const text = (customText !== null ? customText : input).trim();
    if (!text) return;
    handleInterrupt();
    setInput('');
    setFsInput('');
    const history = [...messagesRef.current];
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: Date.now() }]);
    setTimeout(async () => {
      stateManager.setState(State.RETRIEVING);
      const shouldSpeak = isMapFullscreen; // If in map, speak the response so they can hear it
      await streamAIResponse(text, history, !shouldSpeak);
    }, 0);
  };

  const handleRackClick = useCallback((rackCode) => {
    setRouteTo(rackCode);
    showToast(`Showing route to Rack ${rackCode}`, 'success');
  }, [showToast]);

  const handleRouteComplete = useCallback((destination, steps) => {
    if (steps && steps.length > 0) {
      setRouteSteps(steps);
    }
  }, []);

  const handleCloseFullscreenMap = () => {
    setIsMapFullscreen(false);
    setActiveTab('chat');
  };

  return (
    <div className="flex flex-col h-screen bg-[#05070a] text-white overflow-hidden relative selection:bg-purple-500/30">
      <AnimatedBackground />
      
      {/* Main Header */}
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

        {/* RIGHT PANEL: Chat, Search, and Map Viewport */}
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
                  onClick={() => {
                    setActiveTab('map');
                    setIsMapFullscreen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'map' ? 'bg-purple-600/30 text-purple-300 shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <Map size={14} /> Map (3D)
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

              {/* SEARCH VIEW */}
              <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab !== 'search' ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}`}>
                <BookSearch onShowOnMap={(rack) => {
                  setRouteTo(rack);
                  setActiveTab('map');
                  setIsMapFullscreen(true);
                  showToast(`Showing Rack ${rack} in Fullscreen Map`, 'success');
                }} />
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* SINGLE UNIFIED 3D WAYFINDER COMPONENT (FULLSCREEN & PANEL DYNAMIC) */}
      <div 
        className={`transition-opacity duration-200 ${
          isMapFullscreen 
            ? 'fixed inset-0 z-50 bg-[#060912] flex flex-col opacity-100 pointer-events-auto' 
            : activeTab === 'map' 
              ? 'absolute right-6 top-[72px] bottom-6 w-[calc(50%-24px)] rounded-3xl overflow-hidden border border-white/10 shadow-2xl z-20 flex flex-col opacity-100 pointer-events-auto' 
              : 'opacity-0 pointer-events-none absolute -left-[9999px] -top-[9999px] w-1 h-1'
        }`}
      >
        {/* Fullscreen Navigation Header */}
        <div className="h-16 px-6 bg-[#0c1222]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-30 shrink-0 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 shadow-sm">
              <Compass className="text-blue-400 animate-spin-slow" size={18} />
              <span className="text-sm font-bold tracking-wide text-blue-200">3D Indoor Wayfinder</span>
            </div>

            {routeTo && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-amber-300">
                <Navigation size={14} className="text-amber-400" />
                <span>Navigating: <strong>{routeFrom || 'Entrance'}</strong></span>
                <ArrowRight size={12} className="text-amber-400/60" />
                <span className="font-bold text-amber-200">Rack {routeTo}</span>
              </div>
            )}

            {/* Floor Switcher */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
              <button
                onClick={() => setActiveFloor('both')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFloor === 'both' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All Floors
              </button>
              {Array.from({ length: totalFloors }).map((_, i) => (
                <button
                  key={i+1}
                  onClick={() => setActiveFloor(String(i+1))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeFloor === String(i+1) ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Floor {i+1}
                </button>
              ))}
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            {/* Direct Talk to AI Button */}
            <button
              onClick={handleOrbClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${
                conversationState === State.LISTENING 
                  ? 'bg-red-600 text-white shadow-red-600/40 animate-pulse' 
                  : conversationState === State.SPEAKING 
                    ? 'bg-purple-600 text-white shadow-purple-600/40' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'
              }`}
              title="Tap to speak directly with the AI Assistant"
            >
              <Mic size={15} />
              <span>
                {conversationState === State.LISTENING 
                  ? 'Listening... Speak now' 
                  : conversationState === State.SPEAKING 
                    ? 'AI is Speaking (Tap to stop)' 
                    : conversationState === State.GENERATING || conversationState === State.RETRIEVING 
                      ? 'Thinking...' 
                      : '🎙️ Talk to AI'}
              </span>
            </button>

            {/* Toggle Fullscreen / Close Button */}
            {isMapFullscreen ? (
              <button
                onClick={handleCloseFullscreenMap}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-1.5 active:scale-95 shadow-md"
              >
                <X size={15} /> Close Fullscreen
              </button>
            ) : (
              <button
                onClick={() => setIsMapFullscreen(true)}
                className="p-2 rounded-xl text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                title="Expand to Fullscreen"
              >
                <Maximize2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 3D Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-[#05080f]">
          <LibraryWayfinder 
            ref={wayfindRef}
            routeFrom={routeFrom}
            routeTo={routeTo} 
            activeFloor={activeFloor}
            onRackClick={handleRackClick}
            onRouteComplete={handleRouteComplete}
            onConfigLoaded={(c) => setTotalFloors(c.floors || 2)}
          />

          {/* Turn-by-Turn Guidance Overlay Card */}
          {routeSteps.length > 0 && (
            <div className="absolute bottom-6 left-6 max-w-md bg-[#0c1222]/90 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-2xl z-20 space-y-2 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
                <Navigation size={14} /> Turn-by-Turn Guidance
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                {routeSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-200">
                    <CornerDownRight size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fullscreen Bottom Bar with Quick Ask AI Input */}
          {isMapFullscreen && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
              <form onSubmit={(e) => handleTextSend(e, fsInput)} className="flex gap-2 bg-[#0c1222]/90 backdrop-blur-md p-2 rounded-2xl border border-white/15 shadow-2xl">
                <input
                  type="text"
                  value={fsInput}
                  onChange={(e) => setFsInput(e.target.value)}
                  placeholder="Ask assistant or request another rack..."
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!fsInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <Send size={13} /> Send
                </button>
              </form>
            </div>
          )}

          {/* Bottom Floating Hint */}
          <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-1.5 text-xs font-medium text-gray-300 shadow-xl">
              Left Drag: Orbit · Right Drag: Pan · Scroll: Zoom · Press <strong>Esc</strong> to close
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default VoiceAssistant;
