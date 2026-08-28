import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LogOut, User, Send, Sparkles, Search, Mic, Map, X, MessageSquare, 
  Compass, Navigation, ArrowRight, CornerDownRight, 
  GraduationCap, Volume2, BookOpen, Clock, HelpCircle, Layers
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
            speechBuffer = sentenceMatch[2] || '';
            if (sentenceToSpeak.length > 1) {
              ttsManager.speak(sentenceToSpeak);
            }
          }
        }
      }

      // Flush remaining speech buffer
      const cleanRemaining = speechBuffer.replace(/<ROUTE_[^>]*>?/gi, '').trim();
      if (cleanRemaining.length > 0) {
        ttsManager.speak(cleanRemaining);
      }

      // Parse indoor navigation route tags
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

      setVoiceMessages(prev => {
        const newMsg = [...prev];
        if (newMsg.length > 0 && newMsg[newMsg.length - 1].content.trim() === '') {
          newMsg.pop();
          return newMsg;
        }
        return prev;
      });

    } catch (error) {
      console.error('Voice Chat error:', error);
      const errMsg = `Connection Failed: Ensure server is running and Groq API key is set. (${error.message})`;
      setVoiceMessages(prev => {
        const newMsg = [...prev];
        if (newMsg.length > 0 && newMsg[newMsg.length - 1].content === '') {
          newMsg[newMsg.length - 1] = { role: 'assistant', content: errMsg, timestamp: Date.now() };
          return newMsg;
        }
        return [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }];
      });
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

        setChatMessages(prev => {
          const newMsg = [...prev];
          if (newMsg.length > 0 && newMsg[newMsg.length - 1].content.trim() === '') {
            newMsg.pop();
            return newMsg;
          }
          return prev;
        });

      } catch (error) {
        console.error('Text Chat error:', error);
        const errMsg = `Connection Failed: (${error.message})`;
        setChatMessages(prev => {
          const newMsg = [...prev];
          if (newMsg.length > 0 && newMsg[newMsg.length - 1].content === '') {
            newMsg[newMsg.length - 1] = { role: 'assistant', content: errMsg, timestamp: Date.now() };
            return newMsg;
          }
          return [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }];
        });
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

  // Quick voice query suggestions for portrait real estate
  const quickSuggestions = [
    { title: "Where is Artificial Intelligence rack?", rack: "D4" },
    { title: "Find Computer Science books", rack: "C4" },
    { title: "Where is Harry Potter located?", rack: "D6" },
    { title: "Library hours & rules", rack: null }
  ];

  return (
    <div className="flex flex-col h-screen text-slate-900 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900 relative">
      
      {/* Dynamic Interactive Animated Background */}
      <AnimatedBackground />

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR: Clean & Fluid on Portrait and Landscape Viewports */}
      {/* ========================================================================= */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 px-3 sm:px-6 py-2.5 z-20 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* College & Library Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-600/25 text-white shrink-0 ring-2 ring-white">
              <GraduationCap size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 tracking-tight truncate">
                  Anna University
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Online
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                Central Library · AI Assistant
              </p>
            </div>
          </div>

          {/* Mode Switcher Pill */}
          <div className="flex items-center bg-slate-100/90 backdrop-blur-md p-1 rounded-2xl border border-slate-200/70 shrink-0 shadow-sm">
            <button 
              onClick={() => switchMode('voice')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                interactionMode === 'voice' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Mic size={13} />
              <span>Voice</span>
            </button>
            <button 
              onClick={() => switchMode('chat')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                interactionMode === 'chat' 
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <MessageSquare size={13} />
              <span>Chat</span>
            </button>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
              <div className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                {user?.username?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <span className="hidden md:inline max-w-[80px] truncate">{user?.username || 'Student'}</span>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200/80 transition-colors"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CENTER AREA: Optimized for Tall Portrait Displays (1080x1920) */}
      {/* ========================================================================= */}
      <main className="flex-1 flex overflow-hidden relative max-w-6xl w-full mx-auto p-2 sm:p-4 z-10">
        
        {/* -------------------- VOICE MODE -------------------- */}
        {interactionMode === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-between max-w-xl mx-auto w-full overflow-y-auto px-2 py-2 sm:py-4 space-y-3 sm:space-y-4 custom-scrollbar">
            
            {/* Top Prompt / Status Badge */}
            <div className="flex flex-col items-center text-center space-y-1 shrink-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 border border-blue-200 text-blue-700 text-xs font-bold shadow-sm backdrop-blur-md">
                <Sparkles size={13} className="text-blue-600" />
                <span>Sam · AI Library Assistant</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                How can I assist your research today?
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tap the orb to speak, ask for books, or request 3D rack directions
              </p>
            </div>

            {/* Center: The AI Voice Orb & Status Indicator */}
            <div className="flex flex-col items-center justify-center shrink-0 py-2">
              <VoiceOrb state={conversationState} onClick={handleOrbClick} />
              <div className="mt-3">
                <StatusIndicator state={conversationState} />
              </div>
            </div>

            {/* Live Voice Transcript Box (ONLY VOICE DATA) */}
            {lastVoiceMessage && (
              <div className="w-full glass-card rounded-2xl p-3.5 sm:p-4 space-y-2 shrink-0 shadow-sm border border-slate-200/80 bg-white/90 backdrop-blur-md">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {lastVoiceMessage.role === 'user' ? 'You said:' : 'Sam responded:'}
                  </span>
                  {lastVoiceMessage.role === 'assistant' && (
                    <button 
                      onClick={() => handleSpeakAgain(lastVoiceMessage.content)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-[11px]"
                    >
                      <Volume2 size={12} /> Speak Again
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold max-h-24 overflow-y-auto pr-1">
                  {lastVoiceMessage.content}
                </p>
              </div>
            )}

            {/* Quick Interactive Voice Suggestions (fills portrait screen proportionally) */}
            <div className="w-full space-y-1.5 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                Suggested Voice Questions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleVoiceInput(item.title)}
                    className="flex items-center justify-between p-2.5 bg-white/80 hover:bg-blue-50/80 rounded-xl border border-slate-200/80 hover:border-blue-300 text-left transition-all text-xs font-semibold text-slate-700 group shadow-sm"
                  >
                    <span className="truncate mr-2">{item.title}</span>
                    <ArrowRight size={13} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Action Chips */}
            <div className="flex items-center justify-center flex-wrap gap-2 pt-1 pb-1 shrink-0 w-full">
              <button
                onClick={() => { setActiveTab('map'); setIsMapFullscreen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-700 shadow-sm transition-all active:scale-[0.98]"
              >
                <Compass size={14} className="text-blue-600" />
                <span>3D Campus Wayfinder</span>
              </button>
              
              <button
                onClick={() => switchMode('chat')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-bold text-slate-700 hover:text-indigo-700 shadow-sm transition-all active:scale-[0.98]"
              >
                <MessageSquare size={14} className="text-indigo-600" />
                <span>Switch to Text Chat</span>
              </button>
            </div>

          </div>
        )}

        {/* -------------------- CHAT MODE -------------------- */}
        {interactionMode === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            
            {/* Chat Header Tabs */}
            <div className="px-3 sm:px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">AI Interactive Chat</span>
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 shadow-sm">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'chat' 
                      ? 'bg-blue-600 text-white shadow-sm' 
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
                      ? 'bg-indigo-600 text-white shadow-sm' 
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
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 transform-gpu will-change-scroll">
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
                <div className="p-2.5 sm:p-3.5 border-t border-slate-100 bg-white">
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
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-40 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 transition-all"
                    >
                      <Send size={16} />
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
      {/* 3. FULLSCREEN 3D WAYFINDER MODAL */}
      {/* ========================================================================= */}
      {isMapFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <Compass className="text-blue-400" size={18} />
              <span className="font-bold text-sm">3D Indoor Campus Wayfinder</span>
            </div>
            <button 
              onClick={handleCloseFullscreenMap}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <LibraryWayfinder 
              targetRack={routeTo} 
              onRouteComplete={handleRouteComplete}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BOTTOM FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-white/80 border-t border-slate-200/80 py-2 px-4 text-center text-[11px] text-slate-400 shrink-0 font-medium">
        Anna University Central Library AI System · Powered by <strong className="text-slate-600">TechWeGo</strong>
      </footer>

    </div>
  );
};

export default VoiceAssistant;
