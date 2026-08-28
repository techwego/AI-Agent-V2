import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LogOut, User, Send, Sparkles, Search, Mic, Map, X, MessageSquare, 
  Compass, Navigation, ArrowRight, CornerDownRight, 
  GraduationCap, Volume2
} from 'lucide-react';
import LibraryWayfinder from '../components/LibraryWayfinder';
import VoiceOrb from '../components/VoiceOrb';
import StatusIndicator from '../components/StatusIndicator';
import ChatBubble from '../components/ChatBubble';
import BookSearch from '../components/BookSearch';
import { useToast } from '../components/Toast';
import { sendChat, getArchitecture } from '../api/client';

import stateManager, { State } from '../voice/ConversationStateManager';
import ttsManager from '../voice/SpeechSynthesisManager';
import sttManager from '../voice/SpeechRecognitionManager';

const VoiceAssistant = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  // Mode: 'voice' | 'chat'
  const initialMode = searchParams.get('mode') === 'chat' ? 'chat' : 'voice';
  const [interactionMode, setInteractionMode] = useState(initialMode);
  
  const [conversationState, setConversationState] = useState(State.IDLE);
  
  // -------------------------------------------------------------
  // SEPARATE CONVERSATION STATES (DO NOT COMBINE VOICE & CHAT)
  // -------------------------------------------------------------
  const [voiceMessages, setVoiceMessages] = useState([]);
  
  const [chatMessages, setChatMessages] = useState([
    { 
      role: 'assistant', 
      content: "Hello! I'm Sam, your AI Library Assistant. I can help you search books, verify shelf availability, and guide you through the library. How can I help you today?", 
      timestamp: Date.now() 
    }
  ]);

  const [input, setInput] = useState('');
  const [fsInput, setFsInput] = useState('');
  const [routeFrom, setRouteFrom] = useState('entrance');
  const [routeTo, setRouteTo] = useState(null);
  const [hasIntroduced, setHasIntroduced] = useState(false);
  const hasIntroducedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'map' | 'search'
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeFloor, setActiveFloor] = useState('both');
  const [totalFloors, setTotalFloors] = useState(2);
  const [routeSteps, setRouteSteps] = useState([]);
  
  const chatMessagesEndRef = useRef(null);
  const voiceMessagesRef = useRef(voiceMessages);
  const chatMessagesRef = useRef(chatMessages);

  useEffect(() => {
    voiceMessagesRef.current = voiceMessages;
  }, [voiceMessages]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  const analyserRef = useRef(null);
  const wayfindRef = useRef(null);
  const inputRef = useRef(null);

  const switchMode = useCallback((mode) => {
    setInteractionMode(mode);
    setSearchParams({ mode });
  }, [setSearchParams]);

  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      setConversationState(newState);
    });
    
    // Sync latest voice preset configured by Admin
    getArchitecture().then(res => {
      if (res?.data?.voice_preset) {
        ttsManager.setVoice(res.data.voice_preset);
      }
    }).catch(err => {
      console.warn('Could not sync architecture voice preset:', err);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (interactionMode === 'chat') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab, interactionMode]);

  useEffect(() => {
    sttManager.onTranscription((text) => {
      if (text && text.trim()) {
        handleVoiceInput(text.trim());
      } else {
        stateManager.setState(State.IDLE);
        showToast("I didn't catch that. Please speak again.", 'info');
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
    
    // Initial greeting
    if (!hasIntroducedRef.current && currentState === State.IDLE) {
      hasIntroducedRef.current = true;
      setHasIntroduced(true);

      const hour = new Date().getHours();
      let greeting = 'Good evening';
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 17) greeting = 'Good afternoon';
      
      const welcomeText = `${greeting}! I am Sam, your AI Library Assistant. Which book or rack are you looking for today?`;
      
      // Update voice message state
      setVoiceMessages([{ role: 'assistant', content: welcomeText, timestamp: Date.now() }]);

      stateManager.setState(State.INTRODUCING);
      ttsManager.speak(welcomeText, () => {
        if (stateManager.getState() === State.INTRODUCING) {
          stateManager.setState(State.IDLE);
        }
      });
      return;
    }
    
    startListening();
  }, [handleInterrupt, startListening]);

  // -------------------------------------------------------------
  // VOICE-ONLY INPUT HANDLER (ONLY MUTATES voiceMessages)
  // -------------------------------------------------------------
  const handleVoiceInput = useCallback(async (text) => {
    stateManager.setState(State.PROCESSING);
    const history = [...voiceMessagesRef.current];
    setVoiceMessages(prev => [...prev, { role: 'user', content: text, timestamp: Date.now() }]);
    setTimeout(() => {
      stateManager.setState(State.RETRIEVING);
      streamVoiceAIResponse(text, history);
    }, 0);
  }, []);

  const handleSpeakAgain = useCallback((text) => {
    handleInterrupt();
    stateManager.setState(State.SPEAKING);
    ttsManager.speak(text, () => {
      stateManager.reset();
    });
  }, [handleInterrupt]);

  // -------------------------------------------------------------
  // VOICE AI STREAM (SPEAKS WITH TTS & UPDATES voiceMessages)
  // -------------------------------------------------------------
  const streamVoiceAIResponse = useCallback(async (queryText, history = []) => {
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
      let speechBuffer = '';

      setVoiceMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);

      ttsManager.cancel();
      ttsManager.onAllFinished = () => {
        stateManager.reset();
      };

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          speechBuffer += chunk;

          const displayResponse = fullResponse.replace(/<ROUTE_[^>]*>?/gi, '');
          setVoiceMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: displayResponse };
            return newMessages;
          });

          // Sentence-level speech streaming
          const cleanBuf = speechBuffer.replace(/<ROUTE_[^>]*>?/gi, '');
          const sentenceMatch = cleanBuf.match(/^([^.!?\n]+[.!?\n]+)\s*(.*)$/s);
          if (sentenceMatch) {
            const sentenceToSpeak = sentenceMatch[1].trim();
            speechBuffer = sentenceMatch[2];
            if (sentenceToSpeak) {
              stateManager.setState(State.SPEAKING);
              ttsManager.enqueue(sentenceToSpeak);
            }
          }
        }
      }

      if (speechBuffer.trim()) {
        const remainingToSpeak = speechBuffer.replace(/<ROUTE_[^>]*>?/gi, '').trim();
        if (remainingToSpeak) {
          stateManager.setState(State.SPEAKING);
          ttsManager.enqueue(remainingToSpeak);
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
        setVoiceMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: fullResponse, hasRoute: isValid };
          return newMessages;
        });
        
        if (isValid) {
          showToast(`Opening Navigation to Rack ${currentRackCode}`, 'success');
          setActiveTab('map');
          setIsMapFullscreen(true);
        }
      }

    } catch (error) {
      console.error('Voice Chat error:', error);
      const errMsg = `Connection Failed: Ensure server is running and Groq API key is set. (${error.message})`;
      setVoiceMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }]);
      showToast('Server connection error.', 'error');
      stateManager.reset();
    }
  }, [showToast]);

  // -------------------------------------------------------------
  // CHAT-ONLY INPUT HANDLER (ONLY MUTATES chatMessages)
  // -------------------------------------------------------------
  const handleTextSend = async (e, customText = null) => {
    if (e) e.preventDefault();
    const text = (customText !== null ? customText : input).trim();
    if (!text) return;
    
    setInput('');
    setFsInput('');
    const history = [...chatMessagesRef.current];
    setChatMessages(prev => [...prev, { role: 'user', content: text, timestamp: Date.now() }]);
    
    setTimeout(async () => {
      try {
        const recentHistory = history.slice(-5).map(m => ({ role: m.role, content: m.content }));
        const response = await sendChat({ message: text, history: recentHistory });
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let fullResponse = '';

        setChatMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;

            const displayResponse = fullResponse.replace(/<ROUTE_[^>]*>?/gi, '');
            setChatMessages(prev => {
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
          setChatMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: fullResponse, hasRoute: isValid };
            return newMessages;
          });
          
          if (isValid) {
            showToast(`Opening Navigation to Rack ${currentRackCode}`, 'success');
            setActiveTab('map');
            setIsMapFullscreen(true);
          }
        }

      } catch (error) {
        console.error('Text Chat error:', error);
        const errMsg = `Connection Failed: (${error.message})`;
        setChatMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }]);
        showToast('Chat error. Check connection.', 'error');
      }
    }, 0);
  };

  const handleRackClick = useCallback((rackCode) => {
    setRouteTo(rackCode);
    showToast(`Displaying route to Rack ${rackCode}`, 'success');
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

  const lastVoiceMessage = voiceMessages.length > 0 ? voiceMessages[voiceMessages.length - 1] : null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR: College Logo, Library Name, Mode Switcher, User & Actions */}
      {/* ========================================================================= */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3 z-20 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* College & Library Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0">
              <GraduationCap size={20} />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  Anna University Central Library
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                AI Voice & 3D Indoor Campus Wayfinder
              </p>
            </div>
          </div>

          {/* Mode Switcher Pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button 
              onClick={() => switchMode('voice')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                interactionMode === 'voice' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mic size={14} className={interactionMode === 'voice' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Voice</span>
            </button>
            <button 
              onClick={() => switchMode('chat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                interactionMode === 'chat' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MessageSquare size={14} className={interactionMode === 'chat' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Chat</span>
            </button>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <User size={13} className="text-blue-600" />
              <span>{user?.username || 'Student'}</span>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CENTER AREA: Dedicated Voice or Chat Assistant */}
      {/* ========================================================================= */}
      <main className="flex-1 flex overflow-hidden relative max-w-7xl w-full mx-auto p-3 sm:p-4">
        
        {/* -------------------- VOICE MODE -------------------- */}
        {interactionMode === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full overflow-y-auto px-2 py-2 sm:py-4 space-y-4 sm:space-y-5 custom-scrollbar">
            
            {/* Top Prompt / Status Badge */}
            <div className="flex flex-col items-center text-center space-y-1.5 shrink-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-sm">
                <Sparkles size={13} className="text-blue-600" />
                <span>Sam · Voice Agent</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                How can I assist your research today?
              </h2>
              <p className="text-xs text-slate-500">
                Tap the orb to speak, ask for books, or request rack directions
              </p>
            </div>

            {/* Center: The AI Voice Orb & Status */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <VoiceOrb state={conversationState} onClick={handleOrbClick} />
              
              <div className="mt-2">
                <StatusIndicator state={conversationState} />
              </div>
            </div>

            {/* Live Voice Transcript Box (ONLY VOICE DATA) */}
            {lastVoiceMessage && (
              <div className="w-full bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-sm space-y-1.5 shrink-0 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-slate-500">
                    {lastVoiceMessage.role === 'user' ? 'You said:' : 'Sam responded:'}
                  </span>
                  {lastVoiceMessage.role === 'assistant' && (
                    <button 
                      onClick={() => handleSpeakAgain(lastVoiceMessage.content)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      <Volume2 size={12} /> Speak Again
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium max-h-24 overflow-y-auto">
                  {lastVoiceMessage.content}
                </p>
              </div>
            )}

            {/* Action Chips (Properly positioned & never hidden/clipped) */}
            <div className="flex items-center justify-center flex-wrap gap-2.5 pt-1 pb-2 shrink-0 w-full">
              <button
                onClick={() => { setActiveTab('map'); setIsMapFullscreen(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm transition-all active:scale-95"
              >
                <Compass size={14} className="text-blue-600" />
                <span>3D Campus Wayfinder</span>
              </button>
              
              <button
                onClick={() => switchMode('chat')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm transition-all active:scale-95"
              >
                <MessageSquare size={14} className="text-indigo-600" />
                <span>Switch to Text Chat</span>
              </button>
            </div>

          </div>
        )}

        {/* -------------------- CHAT MODE -------------------- */}
        {interactionMode === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            
            {/* Chat Header Tabs */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Interactive Chat</span>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Messages
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'search' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Book Catalog
                </button>
                <button
                  onClick={() => { setActiveTab('map'); setIsMapFullscreen(true); }}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1"
                >
                  <Map size={12} /> Map View
                </button>
              </div>
            </div>

            {/* Chat Body & Viewports */}
            <div className="flex-1 relative overflow-hidden bg-white">
              
              {/* Messages View */}
              <div className={`absolute inset-0 flex flex-col ${activeTab !== 'chat' ? 'hidden' : 'flex'}`}>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <ChatBubble 
                      key={idx} 
                      message={msg} 
                      onSpeak={msg.role === 'assistant' ? handleSpeakAgain : undefined}
                      hasRoute={msg.hasRoute}
                      isSpeaking={conversationState === State.SPEAKING || conversationState === State.INTRODUCING}
                    />
                  ))}
                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 sm:p-4 border-t border-slate-100 bg-white">
                  <form onSubmit={handleTextSend} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search book title, author, or ask for directions (e.g. 'Where is Computer Science rack?')..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-600/20 transition-all"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Book Catalog Search View */}
              <div className={`absolute inset-0 flex flex-col p-4 ${activeTab !== 'search' ? 'hidden' : 'flex'}`}>
                <BookSearch onShowOnMap={(rack) => {
                  setRouteTo(rack);
                  setActiveTab('map');
                  setIsMapFullscreen(true);
                  showToast(`Locating Rack ${rack} in 3D Map`, 'success');
                }} />
              </div>

            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FOOTER: Attribution (Always clean, never overlapping) */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t border-slate-200 py-2.5 px-6 text-center text-xs text-slate-400 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Anna University Central Library AI System</span>
          <span>Powered by <strong className="font-semibold text-slate-600 hover:text-blue-600 transition-colors">TechWeGo</strong> · Intelligent Campus Solutions</span>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4. FULLSCREEN 3D INDOOR WAYFINDER MODAL */}
      {/* ========================================================================= */}
      <div 
        className={`transition-opacity duration-200 ${
          isMapFullscreen 
            ? 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none absolute -left-[9999px] -top-[9999px] w-1 h-1'
        }`}
      >
        <div className="flex-1 flex flex-col m-0 sm:m-4 bg-white rounded-none sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
          
          {/* Wayfinder Header */}
          <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between z-30 shrink-0">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
                <Compass className="animate-spin-slow text-blue-600" size={16} />
                <span>3D Indoor Wayfinder</span>
              </div>

              {routeTo && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800">
                  <Navigation size={13} className="text-amber-600" />
                  <span>From: {routeFrom || 'Entrance'}</span>
                  <ArrowRight size={12} />
                  <span className="font-bold text-amber-900">Rack {routeTo}</span>
                </div>
              )}

              {/* Floor Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                <button
                  onClick={() => setActiveFloor('both')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeFloor === 'both' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All Floors
                </button>
                {Array.from({ length: totalFloors }).map((_, i) => (
                  <button
                    key={i+1}
                    onClick={() => setActiveFloor(String(i+1))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeFloor === String(i+1) ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Floor {i+1}
                  </button>
                ))}
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleOrbClick}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm active:scale-95 ${
                  conversationState === State.LISTENING 
                    ? 'bg-red-500 animate-pulse' 
                    : conversationState === State.SPEAKING 
                      ? 'bg-purple-600' 
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Mic size={14} />
                <span className="hidden sm:inline">
                  {conversationState === State.LISTENING 
                    ? 'Listening...' 
                    : conversationState === State.SPEAKING 
                      ? 'Speaking' 
                      : '🎙️ Voice Guide'}
                </span>
              </button>

              <button
                onClick={handleCloseFullscreenMap}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center gap-1"
              >
                <X size={14} /> <span>Close</span>
              </button>
            </div>
          </div>

          {/* 3D Map Area */}
          <div className="flex-1 relative overflow-hidden bg-slate-100">
            <LibraryWayfinder 
              ref={wayfindRef}
              routeFrom={routeFrom}
              routeTo={routeTo} 
              activeFloor={activeFloor}
              onRackClick={handleRackClick}
              onRouteComplete={handleRouteComplete}
              onConfigLoaded={(c) => setTotalFloors(c.floors || 2)}
            />

            {/* Turn-by-Turn Guidance Overlay */}
            {routeSteps.length > 0 && (
              <div className="absolute bottom-6 left-6 max-w-md bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xl z-20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
                  <Navigation size={14} /> Route Instructions
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-slate-700">
                  {routeSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-medium">
                      <CornerDownRight size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Ask AI Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
              <form onSubmit={(e) => handleTextSend(e, fsInput)} className="flex gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xl">
                <input
                  type="text"
                  value={fsInput}
                  onChange={(e) => setFsInput(e.target.value)}
                  placeholder="Ask for directions to another rack..."
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
                <button
                  type="submit"
                  disabled={!fsInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Send size={13} /> Send
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default VoiceAssistant;
