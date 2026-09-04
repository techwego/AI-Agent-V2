import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LogOut, User, Send, Sparkles, Search, Mic, Map, X, MessageSquare, 
  Compass, Navigation, ArrowRight, CornerDownRight, 
  GraduationCap, Volume2, BookOpen, Clock, HelpCircle, Layers, Radio
} from 'lucide-react';
import LibraryWayfinder from '../components/LibraryWayfinder';
import VoiceOrb from '../components/VoiceOrb';
import StatusIndicator from '../components/StatusIndicator';
import ChatBubble from '../components/ChatBubble';
import BookSearch from '../components/BookSearch';
import AnimatedBackground from '../components/AnimatedBackground';
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
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, voiceMessages, activeTab, interactionMode]);

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

    // Silence timeout: no speech detected, return to idle with a gentle prompt
    sttManager.onSilenceTimeout(() => {
      stateManager.setState(State.IDLE);
      showToast("I didn't catch that. Please speak again.", 'info');
    });

    // Live interim transcript: show partial words as user speaks
    sttManager.onInterimTranscription((interimText) => {
      // Update the last user message with interim text for live feedback
      if (interimText) {
        setVoiceMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'user' && last.interim) {
            return [...prev.slice(0, -1), { role: 'user', content: interimText, timestamp: Date.now(), interim: true }];
          }
          return [...prev, { role: 'user', content: interimText, timestamp: Date.now(), interim: true }];
        });
      }
    });

    return () => {
      sttManager.onTranscription(() => {});
      sttManager.onError(() => {});
      sttManager.onSilenceTimeout(() => {});
      sttManager.onInterimTranscription(() => {});
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
    const history = [...voiceMessagesRef.current].filter(m => !m.interim);
    // Replace any interim transcript with the final confirmed text
    setVoiceMessages(prev => [...prev.filter(m => !m.interim), { role: 'user', content: text, timestamp: Date.now() }]);
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
      ttsManager.startStream();

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
        fullResponse += chunk;
        speechBuffer += chunk;

        const displayResponse = fullResponse.replace(/<ROUTE_[^>]*>?/gi, '');
        setVoiceMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: displayResponse, timestamp: Date.now() };
          return next;
        });

        // Split speech buffer on sentence boundaries
        const cleanBuf = speechBuffer.replace(/<ROUTE_[^>]*>?/gi, '');
        const sentenceMatch = cleanBuf.match(/^([^.!?\n]+[.!?\n]+)\s*(.*)$/s);
        if (sentenceMatch) {
          const sentenceToSpeak = sentenceMatch[1].trim();
          speechBuffer = sentenceMatch[2] || '';
          if (sentenceToSpeak) {
            ttsManager.enqueue(sentenceToSpeak);
          }
        }
      }

      // Flush remaining speech buffer
      const remainingSpeech = speechBuffer.replace(/<ROUTE_[^>]*>?/gi, '').trim();
      if (remainingSpeech) {
        ttsManager.enqueue(remainingSpeech);
      }

      ttsManager.endStream(() => {
        stateManager.setState(State.IDLE);
      });

      // Parse route tag if present
      const routeMatch = fullResponse.match(/<ROUTE_FROM:(.*?)_TO:(.*?)>/i);
      if (routeMatch) {
        let from = routeMatch[1]?.trim() || 'entrance';
        let to = routeMatch[2]?.trim();
        if (to && !['A', 'start_node', 'Y', 'unknown', 'B', 'X'].includes(to)) {
          setRouteFrom(from);
          setRouteTo(to);
          setActiveTab('map');
          setIsMapFullscreen(true);
          showToast(`Opening Navigation to Rack ${to}`, 'success');
        }
      } else {
        const legacyMatch = fullResponse.match(/<ROUTE_TO:(.*?)>/i);
        if (legacyMatch) {
          let to = legacyMatch[1]?.trim();
          if (to && !['A', 'start_node', 'Y', 'unknown', 'B', 'X'].includes(to)) {
            setRouteFrom('entrance');
            setRouteTo(to);
            setActiveTab('map');
            setIsMapFullscreen(true);
            showToast(`Opening Navigation to Rack ${to}`, 'success');
          }
        }
      }

    } catch (err) {
      console.error('Stream Voice AI error:', err);
      showToast('Failed to generate voice response. Please try again.', 'error');
      stateManager.setState(State.IDLE);
    }
  }, [showToast]);

  // -------------------------------------------------------------
  // TEXT CHAT STREAM (DOES NOT PLAY TTS, ONLY MUTATES chatMessages)
  // -------------------------------------------------------------
  const handleTextSend = async (e, customText = null) => {
    if (e) e.preventDefault();
    const queryText = (customText !== null ? customText : input).trim();
    if (!queryText) return;

    if (customText === null) {
      setInput('');
    } else {
      setFsInput('');
    }

    const newMessages = [...chatMessages, { role: 'user', content: queryText, timestamp: Date.now() }];
    setChatMessages(newMessages);

    try {
      const recentHistory = chatMessages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const response = await sendChat({ message: queryText, history: recentHistory });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let fullResponse = '';

      setChatMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
        fullResponse += chunk;

        const displayResponse = fullResponse.replace(/<ROUTE_[^>]*>?/gi, '');
        setChatMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { 
            role: 'assistant', 
            content: displayResponse, 
            timestamp: Date.now(),
            hasRoute: /<ROUTE_[^>]*>/i.test(fullResponse)
          };
          return next;
        });
      }

      // Parse route tag if present
      const routeMatch = fullResponse.match(/<ROUTE_FROM:(.*?)_TO:(.*?)>/i);
      if (routeMatch) {
        let from = routeMatch[1]?.trim() || 'entrance';
        let to = routeMatch[2]?.trim();
        if (to && !['A', 'start_node', 'Y', 'unknown', 'B', 'X'].includes(to)) {
          setRouteFrom(from);
          setRouteTo(to);
          setActiveTab('map');
          setIsMapFullscreen(true);
          showToast(`Opening Navigation to Rack ${to}`, 'success');
        }
      } else {
        const legacyMatch = fullResponse.match(/<ROUTE_TO:(.*?)>/i);
        if (legacyMatch) {
          let to = legacyMatch[1]?.trim();
          if (to && !['A', 'start_node', 'Y', 'unknown', 'B', 'X'].includes(to)) {
            setRouteFrom('entrance');
            setRouteTo(to);
            setActiveTab('map');
            setIsMapFullscreen(true);
            showToast(`Opening Navigation to Rack ${to}`, 'success');
          }
        }
      }

    } catch (err) {
      console.error('Chat AI stream error:', err);
      showToast('Failed to send message. Please try again.', 'error');
    }
  };

  const handleRackClick = (rackId) => {
    setRouteTo(rackId);
    showToast(`Destination set to Rack ${rackId}`, 'info');
  };

  const handleRouteComplete = (steps) => {
    setRouteSteps(steps || []);
  };

  const handleCloseFullscreenMap = () => {
    setIsMapFullscreen(false);
  };

  return (
    <div className="flex flex-col h-screen text-slate-900 bg-slate-50 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900 relative">
      
      {/* 3D Knowledge Constellation Background */}
      <AnimatedBackground />

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR: Clean & Crisp White & Blue Header */}
      {/* ========================================================================= */}
      <header className="bg-white/90 backdrop-blur-2xl border-b border-slate-200/80 px-3 sm:px-6 py-2.5 z-20 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-600/20 text-white ring-2 ring-white shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate leading-tight flex items-center gap-1.5">
                Anna University
                <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  CENTRAL LIBRARY
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium truncate leading-tight">
                AI Research & 3D Wayfinding Assistant
              </p>
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs ml-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-beacon-green" />
              ONLINE
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/70 shadow-xs shrink-0">
            <button 
              onClick={() => switchMode('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                interactionMode === 'voice' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mic size={12} /> <span>Voice</span>
            </button>
            <button 
              onClick={() => switchMode('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                interactionMode === 'chat' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={12} /> <span>Chat</span>
            </button>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-xs">
              <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-[10px] font-mono font-bold">
                {user?.username?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline max-w-[80px] truncate">{user?.username || 'Student'}</span>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" 
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CENTER AREA: Dedicated Voice or Chat Assistant */}
      {/* ========================================================================= */}
      <main className="flex-1 flex overflow-hidden relative max-w-5xl w-full mx-auto px-3 sm:px-4 py-2 z-10">
        
        {/* ── VOICE MODE ── */}
        {interactionMode === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full gap-4 overflow-y-auto custom-scrollbar">
            
            {/* Title Header */}
            <div className="flex flex-col items-center text-center gap-1 shrink-0 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/90 border border-blue-200/80 text-blue-700 text-[11px] font-bold shadow-xs backdrop-blur-md">
                <Sparkles size={11} className="text-amber-500" />
                <span>Sam · AI Library Assistant</span>
              </div>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                How can I assist you today?
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Tap the orb to speak or ask for 3D rack directions
              </p>
            </div>

            {/* 3D Voice Orb + Status (Centered) */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[290px]">
              <VoiceOrb state={conversationState} onClick={handleOrbClick} />
              <div className="mt-3 z-10">
                <StatusIndicator state={conversationState} />
              </div>
            </div>

            {/* Live Scrolling Speech Transcript Feed */}
            <div className="w-full rounded-3xl p-4 sm:p-5 shrink-0 border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-xl shadow-blue-500/5 flex flex-col min-h-[210px] max-h-[280px] mb-2">
              <div className="flex items-center justify-between mb-3 shrink-0 pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                  Live Transcript Stream
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">VOICE ACTIVE</span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar text-sm sm:text-base font-medium">
                {voiceMessages.filter(m => m.role !== 'system').length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                    Tap the microphone orb above to begin speaking...
                  </div>
                ) : (
                  voiceMessages.filter(m => m.role !== 'system').map((msg, idx) => (
                    <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeInScale_0.2s_ease-out]`}>
                      <div className={`px-4 py-2.5 rounded-2xl max-w-[90%] shadow-xs text-xs sm:text-sm ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-500/50 rounded-br-xs' 
                          : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-xs'
                      }`}>
                        {msg.interim && (
                          <span className="inline-block w-1.5 h-3 mr-1 bg-amber-400 animate-pulse align-middle" />
                        )}
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatMessagesEndRef} />
              </div>
            </div>

            {/* Action Chips */}
            <div className="flex items-center justify-center flex-wrap gap-3 shrink-0 pb-2">
              <button
                onClick={() => { setActiveTab('map'); setIsMapFullscreen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-700 shadow-xs transition-all active:scale-[0.97] interactive-card"
              >
                <Compass size={14} className="text-blue-600" />
                <span>3D Wayfinder</span>
              </button>
              <button
                onClick={() => switchMode('chat')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:text-indigo-700 shadow-xs transition-all active:scale-[0.97] interactive-card"
              >
                <MessageSquare size={14} className="text-indigo-600" />
                <span>Text Chat</span>
              </button>
            </div>

          </div>
        )}

        {/* -------------------- CHAT MODE -------------------- */}
        {interactionMode === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-blue-500/5 overflow-hidden animate-[fadeInScale_0.2s_ease-out]">
            
            {/* Chat Header Tabs */}
            <div className="px-3 sm:px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono">AI Interactive Chat</span>
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 shadow-xs">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'chat' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare size={12} />
                  <span>Messages</span>
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'search' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search size={12} />
                  <span>Catalog</span>
                </button>
                <button
                  onClick={() => { setActiveTab('map'); setIsMapFullscreen(true); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition-all"
                >
                  <Map size={12} />
                  <span>3D Map</span>
                </button>
              </div>
            </div>

            {/* Chat Body & Viewports */}
            <div className="flex-1 relative overflow-hidden bg-white">
              
              {/* Messages View */}
              <div className={`absolute inset-0 flex flex-col ${activeTab !== 'chat' ? 'hidden' : 'flex'}`}>
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 transform-gpu will-change-scroll flex flex-col custom-scrollbar">
                  {chatMessages.length === 1 && chatMessages[0].role === 'assistant' ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-90 animate-[fadeInScale_0.5s_ease-out]">
                      <dotlottie-player 
                        src="https://lottie.host/5f487827-1593-41da-9e88-be41a8bddc2d/fBYqkdblAg.lottie" 
                        background="transparent" 
                        speed="1" 
                        style={{ width: '220px', height: '220px' }} 
                        direction="1" 
                        playMode="normal" 
                        loop 
                        autoplay
                      ></dotlottie-player>
                      <h3 className="text-slate-900 font-extrabold text-lg mt-1">How can I help you today?</h3>
                      <p className="text-slate-500 font-medium text-xs mt-1.5 text-center max-w-[280px] leading-relaxed">
                        Ask me for book locations, shelf availability, or 3D campus wayfinding directions.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <ChatBubble 
                        key={idx} 
                        message={msg} 
                        onSpeak={msg.role === 'assistant' ? handleSpeakAgain : undefined}
                        hasRoute={msg.hasRoute}
                        isSpeaking={conversationState === State.SPEAKING || conversationState === State.INTRODUCING}
                      />
                    ))
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 border-t border-slate-100 bg-white">
                  <form onSubmit={handleTextSend} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask for books, authors, or directions (e.g. 'Where is AI rack?')..."
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] disabled:opacity-40 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 transition-all"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Book Catalog Search View */}
              <div className={`absolute inset-0 flex flex-col p-3 sm:p-4 ${activeTab !== 'search' ? 'hidden' : 'flex'}`}>
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
      {/* 3. FULLSCREEN 3D WAYFINDER MODAL WITH FLOATING AI CHAT & INSTRUCTIONS */}
      {/* ========================================================================= */}
      <div 
        className={`transition-opacity duration-200 ${
          isMapFullscreen 
            ? 'fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex flex-col opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none absolute -left-[9999px] -top-[9999px] w-1 h-1'
        }`}
      >
        <div className="flex-1 flex flex-col m-0 sm:m-3 bg-white rounded-none sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
          
          {/* Wayfinder Header Toolbar */}
          <div className="px-4 py-3 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between z-30 shrink-0 shadow-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-600/20">
                <Compass className="animate-spin-slow" size={14} />
                <span>3D Indoor Wayfinder</span>
              </div>

              {routeTo && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 shadow-xs font-mono">
                  <Navigation size={12} className="text-amber-600" />
                  <span>From: {routeFrom || 'Entrance'}</span>
                  <ArrowRight size={11} className="text-amber-500" />
                  <span className="font-extrabold text-amber-900">Rack {routeTo}</span>
                </div>
              )}

              {/* Floor Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-0.5">
                <button
                  onClick={() => setActiveFloor('both')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeFloor === 'both' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Floors
                </button>
                {Array.from({ length: totalFloors }).map((_, i) => (
                  <button
                    key={i+1}
                    onClick={() => setActiveFloor(String(i+1))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeFloor === String(i+1) 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Floor {i+1}
                  </button>
                ))}
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOrbClick}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-[0.97] ${
                  conversationState === State.LISTENING 
                    ? 'bg-red-500 animate-pulse' 
                    : conversationState === State.SPEAKING 
                      ? 'bg-purple-600' 
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Mic size={13} />
                <span className="hidden sm:inline">
                  {conversationState === State.LISTENING 
                    ? 'Listening...' 
                    : conversationState === State.SPEAKING 
                      ? 'Speaking' 
                      : 'Voice Guide'}
                </span>
              </button>

              <button
                onClick={handleCloseFullscreenMap}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
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
              <div className="absolute bottom-16 sm:bottom-6 left-3 sm:left-6 max-w-sm bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3.5 shadow-xl z-20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider font-mono">
                  <Navigation size={13} /> Route Instructions
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-slate-700">
                  {routeSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs font-medium">
                      <CornerDownRight size={12} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Ask AI Chat Bar inside the Map */}
            <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-3">
              <form onSubmit={(e) => handleTextSend(e, fsInput)} className="flex gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-xl">
                <input
                  type="text"
                  value={fsInput}
                  onChange={(e) => setFsInput(e.target.value)}
                  placeholder="Ask Sam for directions to any book or rack..."
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
                <button
                  type="submit"
                  disabled={!fsInput.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1 active:scale-[0.97]"
                >
                  <Send size={12} /> Send
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-white/90 backdrop-blur-md border-t border-slate-200/80 py-1.5 px-4 text-center shrink-0 z-20">
        <p className="text-[10px] text-slate-400 font-medium font-mono">
          ANNA UNIVERSITY CENTRAL LIBRARY AI SYSTEM <span className="mx-1 text-slate-300">|</span> POWERED BY <strong className="text-slate-600 font-extrabold">TECHWEGO</strong>
        </p>
      </footer>

    </div>
  );
};

export default VoiceAssistant;
