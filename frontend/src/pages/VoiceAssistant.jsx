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
  const [routeFrom, setRouteFrom] = useState('entrance');
  const [routeTo, setRouteTo] = useState(null);
  const [hasIntroduced, setHasIntroduced] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'map', or 'search'
  
  const messagesEndRef = useRef(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
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
    const introText = "Hello! I'm Sam, your AI Assistant. Tap the orb to ask a question.";
    
    ttsManager.speak(introText, () => {
      if (stateManager.getState() === State.INTRODUCING) {
        stateManager.setState(State.IDLE);
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

      const routeMatch = fullResponse.match(/<ROUTE_FROM:([A-Za-z0-9_\-]+)_TO:([A-Za-z0-9_\-]+)>/i);
      const fallbackRouteMatch = fullResponse.match(/<ROUTE_TO:([A-Za-z0-9_\-]+)>/i);

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
          showToast(`Routing to Rack ${currentRackCode}`, 'success');
          setActiveTab('map'); // Automatically show map on route
        }
      }

      if (fullResponse.trim()) {
        if (!isTextOnly) {
          stateManager.setState(State.SPEAKING);
          ttsManager.speak(fullResponse, () => {
            stateManager.reset(); // Go to IDLE, user must tap orb to speak again
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
    const history = [...messagesRef.current];
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: Date.now() }]);
    setTimeout(async () => {
      stateManager.setState(State.RETRIEVING);
      setActiveTab('chat');
      await streamAIResponse(text, history, true);
    }, 0);
  };

  const handleRackClick = useCallback((rackCode) => {
    const text = `Route to Rack ${rackCode}`;
    const history = [...messagesRef.current];
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: Date.now() }]);
    setTimeout(() => {
      stateManager.setState(State.RETRIEVING);
      setActiveTab('chat');
      streamAIResponse(text, history, true);
    }, 0);
  }, [streamAIResponse]);

  const isActive = conversationState !== State.IDLE;
  const isListeningState = conversationState === State.LISTENING;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#05080f] overflow-hidden text-white">
      
      {/* Background 3D Map */}
      <div className="absolute inset-0 z-0">
        <LibraryWayfinder 
          ref={wayfindRef}
          routeFrom={routeFrom}
          routeTo={routeTo} 
          onRackClick={handleRackClick}
          activeFloor="both"
        />
      </div>
      
      {/* Floating Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between pointer-events-none">
        <div className="wayfinder-glass px-5 py-3 pointer-events-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center border border-white/10 shadow-lg">
            <Sparkles size={15} className="text-white drop-shadow-md" />
          </div>
          <div>
            <div className="wayfinder-eyebrow mb-1">Interactive Wayfinder</div>
            <h1 className="text-base font-bold tracking-tight">Library <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI</span></h1>
          </div>
        </div>

        <div className="wayfinder-glass p-2 pointer-events-auto flex items-center gap-3">
          <div className="flex bg-[#0a0e1a]/50 rounded-lg p-1 border border-white/5 shadow-inner">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'chat' ? 'bg-blue-600/30 text-blue-300 shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
              <MessageSquare size={14} /> AI Assistant
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'search' ? 'bg-emerald-600/30 text-emerald-300 shadow-md' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
              <Search size={14} /> Catalog
            </button>
          </div>
          
          <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a0e1a]/50 text-xs border border-white/5 shadow-inner">
            <User size={12} className="text-blue-300" />
            <span className="font-semibold text-gray-200">{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Floating Bottom Left Panel - Assistant */}
      <div className={`absolute left-4 bottom-4 w-[360px] max-h-[65vh] flex flex-col z-20 pointer-events-none transition-transform duration-500 ease-out ${activeTab === 'chat' ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
        <div className="wayfinder-glass flex flex-col h-full pointer-events-auto overflow-hidden">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#24314d] flex items-center justify-between bg-[#111a2e]/50 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(63,167,150,0.8)]"></div>
              <h2 className="font-bold text-sm text-white font-['Space_Grotesk'] tracking-wide">Library Assistant</h2>
            </div>
            {/* Embedded Mini Orb */}
            <div className="scale-50 origin-right relative w-12 h-12 flex items-center justify-center -mr-2">
               <VoiceOrb state={conversationState} onClick={handleOrbClick} />
            </div>
          </div>

          {/* Chat Log */}
          <div 
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar"
            ref={rightPanelRef}
            style={{ maxHeight: '40vh' }}
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

          {/* Controls */}
          <div className="border-t border-[#24314d] p-3 flex flex-col gap-2 bg-[#0d1524]/80 backdrop-blur-md">
            <div className="flex items-center justify-center mb-1">
               <StatusIndicator state={conversationState} />
            </div>
            
            <form onSubmit={handleTextSend} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to find a book..."
                className="flex-1 bg-[#111a2e] border border-[#24314d] text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:border-[#f2a93b] transition-colors shadow-inner"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="bg-[#f2a93b] hover:bg-yellow-500 disabled:opacity-40 text-[#1a1204] font-semibold w-11 rounded-lg flex items-center justify-center transition-all shadow-lg"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
          
        </div>
      </div>

      {/* Floating Right Panel - Catalog Search */}
      <div className={`absolute right-4 top-24 bottom-4 w-[400px] flex flex-col z-20 pointer-events-none transition-transform duration-500 ease-out ${activeTab === 'search' ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0 pointer-events-none'}`}>
        <div className="wayfinder-glass flex flex-col h-full pointer-events-auto overflow-hidden">
          <BookSearch onShowOnMap={(rack) => {
            setRouteTo(rack);
            setActiveTab('chat');
            showToast(`Showing Route to Rack ${rack}`, 'success');
          }} />
        </div>
      </div>

      {/* Floating Directions (Visible only when routing) */}
      <div className={`absolute right-4 bottom-4 w-[300px] z-15 pointer-events-none transition-all duration-500 ${routeTo && activeTab === 'chat' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="wayfinder-glass p-4 pointer-events-auto shadow-2xl border-[#f2a93b]/30">
           <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white mb-2 flex items-center gap-2">
             <Map size={14} className="text-[#f2a93b]" /> Turn-by-turn Navigation
           </h3>
           <div className="text-xs text-gray-300 font-medium leading-relaxed bg-[#0a0e1a]/50 p-3 rounded-lg border border-white/5">
              Following glowing path to Rack <span className="text-[#f2a93b] font-bold">{routeTo}</span>.<br/><br/>
              Use the AI Assistant to ask for details about the books located here!
           </div>
        </div>
      </div>

    </div>
  );
};

export default VoiceAssistant;
