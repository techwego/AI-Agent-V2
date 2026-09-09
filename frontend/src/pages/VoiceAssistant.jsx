import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LogOut, User, Send, Sparkles, Search, Mic, Map, X, MessageSquare, 
  Compass, Navigation, ArrowRight, CornerDownRight, 
  GraduationCap, Volume2, BookOpen, Clock, HelpCircle, Layers, Radio,
  Megaphone, Bell, Calendar, Tag, ChevronRight, Shield, ShieldCheck, HeartHandshake,
  ArrowRightLeft
} from 'lucide-react';
import LibraryWayfinder from '../components/LibraryWayfinder';
import InteractiveVideoAvatar from '../components/InteractiveVideoAvatar';
import RobotLottieAvatar from '../components/RobotLottieAvatar';
import ChatBubble from '../components/ChatBubble';
import BookSearch from '../components/BookSearch';
import AnimatedBackground from '../components/AnimatedBackground';
import { useToast } from '../components/Toast';
import { sendChat, getArchitecture, getActiveCirculars, getGuestById } from '../api/client';

import stateManager, { State } from '../voice/ConversationStateManager';
import ttsManager from '../voice/SpeechSynthesisManager';
import sttManager from '../voice/SpeechRecognitionManager';

const VoiceAssistant = () => {
  const { user, logoutUser, isAdmin } = useAuth();
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
  const [chatMessages, setChatMessages] = useState([]);
  const hasIntroducedRef = useRef(false);

  const [input, setInput] = useState('');
  const [fsInput, setFsInput] = useState('');
  const [routeFrom, setRouteFrom] = useState('entrance');
  const [routeTo, setRouteTo] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'map' | 'search'
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeFloor, setActiveFloor] = useState('both');
  const [totalFloors, setTotalFloors] = useState(2);
  const [routeSteps, setRouteSteps] = useState([]);
  const [activeCirculars, setActiveCirculars] = useState([]);
  const [guestData, setGuestData] = useState(null);
  const [mapConfig, setMapConfig] = useState(null);
  const [systemProfile, setSystemProfile] = useState(() => ({
    agent_name: localStorage.getItem('cached_agent_name') || 'Sam',
    greeting_message: localStorage.getItem('cached_greeting_message') || 'How can I assist you today?',
    college_name: localStorage.getItem('cached_college_name') || 'Anna University',
    library_name: localStorage.getItem('cached_library_name') || 'Anna University Central Library'
  }));
  const systemProfileRef = useRef(systemProfile);

  useEffect(() => {
    systemProfileRef.current = systemProfile;
  }, [systemProfile]);
  
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

  const syncSystemProfile = useCallback(() => {
    // Read local cache immediately to prevent voice latency
    const localVoice = localStorage.getItem('cached_voice_preset') || localStorage.getItem('preferred_voice');
    if (localVoice) {
      ttsManager.setVoice(localVoice);
    }

    getArchitecture().then(res => {
      if (res?.data) {
        if (res.data.voice_preset) {
          ttsManager.setVoice(res.data.voice_preset);
        }
        const profile = {
          agent_name: res.data.agent_name || 'Sam',
          greeting_message: res.data.greeting_message || 'How can I assist you today?',
          college_name: res.data.college_name || 'Anna University',
          library_name: res.data.library_name || 'Anna University Central Library'
        };
        setSystemProfile(profile);
        systemProfileRef.current = profile;
        localStorage.setItem('cached_agent_name', profile.agent_name);
        localStorage.setItem('cached_greeting_message', profile.greeting_message);
        localStorage.setItem('cached_college_name', profile.college_name);
        localStorage.setItem('cached_library_name', profile.library_name);
      }
    }).catch(err => {
      console.warn('Could not sync architecture voice preset:', err);
    });
  }, []);

  useEffect(() => {
    // Pre-warm Web Speech API and Microphone audio context on mount for zero first-click lag
    ttsManager.preWarm();
    sttManager.preWarmMic();

    const unsubscribe = stateManager.subscribe((newState) => {
      setConversationState(newState);
    });
    
    syncSystemProfile();
    window.addEventListener('system-settings-change', syncSystemProfile);

    // Fetch today's active campus circulars
    getActiveCirculars().then(res => {
      setActiveCirculars(res.data || []);
    }).catch(err => {
      console.warn('Could not load active circulars:', err);
    });

    // Check if entered as a VIP Guest
    const guestId = searchParams.get('guest_id');
    if (guestId) {
      getGuestById(guestId).then(res => {
        if (res.data) {
          setGuestData(res.data);
          const customGreeting = res.data.greeting_message;
          if (customGreeting && !hasIntroducedRef.current) {
            hasIntroducedRef.current = true;
            setVoiceMessages([{ role: 'ai', content: customGreeting, timestamp: Date.now() }]);
            setChatMessages([{ role: 'assistant', content: customGreeting, timestamp: Date.now() }]);
            
            // Allow slight delay for audio context to settle, then speak
            setTimeout(() => {
              stateManager.setState(State.SPEAKING);
              ttsManager.speak(customGreeting, () => {
                stateManager.setState(State.IDLE);
              });
            }, 600);
          }
        }
      }).catch(err => {
        console.warn('Could not load guest details:', err);
      });
    }

    return () => {
      unsubscribe();
      window.removeEventListener('system-settings-change', syncSystemProfile);
    };
  }, [syncSystemProfile, searchParams]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, voiceMessages, activeTab, interactionMode]);

  useEffect(() => {
    // When user starts speaking actively, keep state in LISTENING
    sttManager.onSpeechDetected(() => {
      if (stateManager.getState() !== State.LISTENING) {
        stateManager.setState(State.LISTENING);
      }
    });

    // When user finishes speaking (1200ms silence detected), immediately transition to PROCESSING (Thinking...)
    sttManager.onSpeechEnded(() => {
      stateManager.setState(State.PROCESSING);
    });

    // When TTS starts speaking out loud, transition state to SPEAKING (unless currently INTRODUCING)
    ttsManager.onStartSpeaking(() => {
      if (stateManager.getState() !== State.INTRODUCING) {
        stateManager.setState(State.SPEAKING);
      }
    });

    sttManager.onTranscription((text) => {
      const normalized = (text || '').toLowerCase().trim().replace(/[.,!?]/g, "");
      const videoHallucinations = [
        "thanks for watching", "thank you for watching", "subtitles by", "amara.org", "subscribed", "subscribe"
      ];

      if (text && text.trim() && !videoHallucinations.some(h => normalized.includes(h))) {
        handleVoiceInput(text.trim());
      } else {
        stateManager.setState(State.IDLE);
      }
    });

    sttManager.onError((errorMsg) => {
      stateManager.setState(State.IDLE);
      showToast(errorMsg, 'error');
    });

    // Silence timeout: no speech detected, return to idle silently
    sttManager.onSilenceTimeout(() => {
      stateManager.setState(State.IDLE);
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
      sttManager.onSpeechDetected(() => {});
      sttManager.onSpeechEnded(() => {});
      ttsManager.onStartSpeaking(() => {});
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
          handleCloseFullscreenMap();
        } else {
          handleInterrupt();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversationState, isMapFullscreen]);

  // -------------------------------------------------------------
  // 30-SECOND STUDENT & GUEST INACTIVITY AUTO-LOGOUT
  // -------------------------------------------------------------
  useEffect(() => {
    // Only apply inactivity timeout to students/guests (not admins)
    if (isAdmin || user?.role === 'admin') return;

    const INACTIVITY_TIMEOUT_MS = 30000; // 30 seconds
    let timeoutId = null;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('[Inactivity] 30s timeout elapsed. Returning to login page.');
        ttsManager.cancel();
        sttManager.stopListening();
        stateManager.reset();
        logoutUser();
        navigate('/login');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    // Start timer on mount
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [isAdmin, user, logoutUser, navigate]);

  const handleLogout = () => {
    ttsManager.cancel();
    sttManager.stopListening();
    stateManager.reset();
    logoutUser();
    navigate('/login');
  };

  const handleInterrupt = useCallback(() => {
    ttsManager.cancel();
    sttManager.cancelTranscription();
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
    
    // 1. If speaking or introducing: instant interrupt -> IDLE
    if (currentState === State.SPEAKING || currentState === State.INTRODUCING) { 
      handleInterrupt(); 
      return; 
    }
    
    // 2. If listening: immediate visual feedback with zero lag
    if (currentState === State.LISTENING) { 
      if (sttManager.hasSpoken) {
        stateManager.setState(State.PROCESSING);
      } else {
        stateManager.setState(State.IDLE);
      }
      sttManager.stopListening(); 
      return; 
    }
    
    // 3. If processing/retrieving/generating: clicking orb cancels and resets to IDLE
    if (currentState === State.PROCESSING || currentState === State.RETRIEVING || currentState === State.GENERATING) {
      handleInterrupt();
      return;
    }
    
    // 4. Start listening immediately on orb click
    if (!hasIntroducedRef.current) {
      hasIntroducedRef.current = true;
      stateManager.setState(State.INTRODUCING);
      
      const hour = new Date().getHours();
      let greeting = 'Hello';
      if (hour >= 5 && hour < 12) greeting = 'Good morning';
      else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
      else if (hour >= 17 && hour < 22) greeting = 'Good evening';
      
      const curProfile = systemProfileRef.current;
      const introText = `${greeting}! I am ${curProfile.agent_name || 'AI Assistant'}, your AI Library Assistant at ${curProfile.library_name || 'the Central Library'}. ${curProfile.greeting_message || 'Which book or rack are you looking for today?'}`;
      
      setVoiceMessages(prev => [...prev, { role: 'ai', content: introText, timestamp: Date.now() }]);
      
      ttsManager.speak(introText, () => {
        // After intro speech completes, transition automatically to LISTENING so user can speak immediately
        if (stateManager.setState(State.LISTENING)) {
          setTimeout(() => {
            sttManager.startListening();
          }, 350);
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

        // Split speech buffer on sentence boundaries or early clause boundaries for ultra-low latency speech playback
        const cleanBuf = speechBuffer.replace(/<ROUTE_[^>]*>?/gi, '');
        const sentenceMatch = cleanBuf.match(/^([^.!?\n]+[.!?\n]+)\s*(.*)$/s) || 
          (!fullResponse.includes('.') && cleanBuf.split(/\s+/).length >= 6 ? cleanBuf.match(/^([^,;:\n]+[,;:\n]+)\s*(.*)$/s) : null);
        if (sentenceMatch) {
          const sentenceToSpeak = sentenceMatch[1].trim();
          speechBuffer = sentenceMatch[2] || '';
          if (sentenceToSpeak) {
            ttsManager.enqueue(sentenceToSpeak);
          }
        }
      }

      // If full response was completely empty, provide an informative verbal response
      if (!fullResponse.trim()) {
        const fallbackMsg = "Could you please specify the book title, author, or rack number you are looking for?";
        fullResponse = fallbackMsg;
        setVoiceMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: fallbackMsg, timestamp: Date.now() };
          return next;
        });
        ttsManager.enqueue(fallbackMsg);
      }

      // Flush remaining speech buffer
      const remainingSpeech = speechBuffer.replace(/<ROUTE_[^>]*>?/gi, '').trim();
      if (remainingSpeech) {
        ttsManager.enqueue(remainingSpeech);
      }

      // Check if user's input expressed parting/closing intent
      const isPartingIntent = /\b(thank you|thanks|thank you very much|thanks a lot|bye|goodbye|bye bye|end conversation|end chat|close chat|exit|quit|see you|see you later|that is all|that's all)\b/i.test(queryText.trim());

      ttsManager.endStream(() => {
        if (isPartingIntent) {
          stateManager.setState(State.IDLE);
          sttManager.stopListening();
        } else {
          // Continuous listening mode: automatically start listening for the next user query
          if (stateManager.setState(State.LISTENING)) {
            setTimeout(() => {
              sttManager.startListening();
            }, 350);
          }
        }
      });

      // Parse route tag if present
      const routeMatch = fullResponse.match(/<ROUTE_FROM:(.*?)_TO:(.*?)>/i);
      if (routeMatch) {
        let from = routeMatch[1]?.trim() || 'entrance';
        let to = routeMatch[2]?.trim();
        if (to && !['A', 'start_node', 'Y', 'unknown', 'B', 'X'].includes(to)) {
          setRouteFrom(from);
          setRouteTo(to);
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
            setIsMapFullscreen(true);
            showToast(`Opening Navigation to Rack ${to}`, 'success');
          }
        }
      }

    } catch (err) {
      console.error('Stream Voice AI error:', err);
      const errorMsg = "I had trouble generating a response. Please ask your question again.";
      setVoiceMessages(prev => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === 'assistant' && !next[next.length - 1].content) {
          next[next.length - 1] = { role: 'assistant', content: errorMsg, timestamp: Date.now() };
          return next;
        }
        return [...next, { role: 'assistant', content: errorMsg, timestamp: Date.now() }];
      });
      ttsManager.speak(errorMsg, () => {
        if (stateManager.setState(State.LISTENING)) {
          sttManager.startListening();
        }
      });
      showToast('Failed to generate voice response. Please try again.', 'error');
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

    const isFirstMessage = chatMessages.length === 0;
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i.test(queryText.trim());

    if (isFirstMessage && isGreeting) {
      const hour = new Date().getHours();
      let greeting = 'Good evening';
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 17) greeting = 'Good afternoon';
      
      const curProfile = systemProfileRef.current;
      const welcomeText = `${greeting}! I am ${curProfile.agent_name || 'AI Assistant'}, your AI Library Assistant at ${curProfile.library_name || 'the Central Library'}. ${curProfile.greeting_message || 'Which book or rack are you looking for today?'}`;
      
      setChatMessages([
        { role: 'user', content: queryText, timestamp: Date.now() },
        { role: 'assistant', content: welcomeText, timestamp: Date.now() + 1 }
      ]);
      return;
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
        const routeMatch = fullResponse.match(/<ROUTE_FROM:(.*?)_TO:(.*?)>/i) || fullResponse.match(/<ROUTE_TO:(.*?)>/i);
        const destRack = routeMatch ? (routeMatch[2] || routeMatch[1])?.trim() : null;

        setChatMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { 
            role: 'assistant', 
            content: displayResponse, 
            timestamp: Date.now(),
            hasRoute: Boolean(routeMatch),
            routeTarget: destRack
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

  const handleShowDirectRoute = useCallback((destRack) => {
    if (!destRack) return;
    const cleanRack = destRack.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
    setRouteFrom('entrance');
    setRouteTo(cleanRack);
    setIsMapFullscreen(true);
    showToast(`Routing from Entrance to Rack ${cleanRack}`, 'info');
  }, [showToast]);

  const handleRackClick = useCallback((rackId) => {
    setRouteTo(rackId);
    showToast(`Navigating to Rack ${rackId}`, 'info');
  }, [showToast]);

  const handleRouteComplete = useCallback((destCode, steps) => {
    setRouteSteps(steps || []);
  }, []);

  const handleConfigLoaded = useCallback((c) => {
    if (c) {
      setMapConfig(c);
      setTotalFloors(c.floors || 2);
    }
  }, []);

  // Compute available start points from mapConfig
  const availableStarts = useMemo(() => {
    const list = [
      { id: 'entrance', label: '🚪 Main Entrance' }
    ];
    if (mapConfig?.custom_layout?.pois && Array.isArray(mapConfig.custom_layout.pois)) {
      mapConfig.custom_layout.pois.forEach((poi, idx) => {
        const poiId = poi.id || (poi.type + '_' + idx);
        const icon = poi.type === 'info' ? 'ℹ️ ' : poi.type === 'rfid' ? '📡 ' : poi.type === 'stairs' ? '🪜 ' : '📍 ';
        list.push({ id: poiId, label: `${icon}${poi.name || poiId}` });
      });
    } else {
      list.push(
        { id: 'poi_infodesk', label: 'ℹ️ Information / Help Desk' },
        { id: 'poi_rfid', label: '📡 RFID Return Station' },
        { id: 'stairs_1', label: '🪜 Stairs Floor 1' },
        { id: 'stairs_2', label: '🪜 Stairs Floor 2' }
      );
    }

    if (mapConfig?.custom_layout?.racks) {
      Object.values(mapConfig.custom_layout.racks).forEach(r => {
        const customName = r.name || (mapConfig.custom_racks && mapConfig.custom_racks[r.code]) || `Rack ${r.code}`;
        list.push({ id: 'r' + r.code, label: `📚 Rack ${r.code} (${customName})` });
      });
    } else if (mapConfig?.rows_per_floor && mapConfig?.cols_per_row) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let rackIdx = 0;
      for (let f = 0; f < (mapConfig.floors || 2); f++) {
        for (let r = 0; r < mapConfig.rows_per_floor; r++) {
          const rowLetter = alphabet[rackIdx % alphabet.length];
          rackIdx++;
          for (let c = 0; c < mapConfig.cols_per_row; c++) {
            const code = rowLetter + (c + 1);
            const customName = (mapConfig.custom_racks && mapConfig.custom_racks[code]) || `Rack ${code}`;
            list.push({ id: 'r' + code, label: `📚 Rack ${code} (${customName})` });
          }
        }
      }
    }
    return list;
  }, [mapConfig]);

  // Compute available destinations from mapConfig
  const availableDestinations = useMemo(() => {
    const list = [];
    if (mapConfig?.custom_layout?.racks) {
      Object.values(mapConfig.custom_layout.racks).forEach(r => {
        const customName = r.name || (mapConfig.custom_racks && mapConfig.custom_racks[r.code]) || `Rack ${r.code}`;
        list.push({ id: r.code, label: `Rack ${r.code} · ${customName}` });
      });
    } else if (mapConfig?.rows_per_floor && mapConfig?.cols_per_row) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let rackIdx = 0;
      for (let f = 0; f < (mapConfig.floors || 2); f++) {
        for (let r = 0; r < mapConfig.rows_per_floor; r++) {
          const rowLetter = alphabet[rackIdx % alphabet.length];
          rackIdx++;
          for (let c = 0; c < mapConfig.cols_per_row; c++) {
            const code = rowLetter + (c + 1);
            const customName = (mapConfig.custom_racks && mapConfig.custom_racks[code]) || `Rack ${code}`;
            list.push({ id: code, label: `Rack ${code} · ${customName}` });
          }
        }
      }
    }

    if (mapConfig?.custom_layout?.pois && Array.isArray(mapConfig.custom_layout.pois)) {
      mapConfig.custom_layout.pois.forEach((poi, idx) => {
        const poiId = poi.id || (poi.type + '_' + idx);
        const icon = poi.type === 'info' ? 'ℹ️ ' : poi.type === 'rfid' ? '📡 ' : '📍 ';
        list.push({ id: poiId, label: `${icon}${poi.name || poiId}` });
      });
    } else {
      list.push(
        { id: 'infodesk', label: 'ℹ️ Information / Help Desk' },
        { id: 'rfid', label: '📡 RFID Return Station' }
      );
    }
    return list;
  }, [mapConfig]);

  const handleSwapRoute = () => {
    if (!routeTo) return;
    const oldFrom = routeFrom;
    const oldTo = routeTo;
    setRouteFrom(oldTo.startsWith('r') ? oldTo : 'r' + oldTo);
    setRouteTo(oldFrom.replace(/^r/i, ''));
    showToast('Swapped route direction', 'info');
  };

  const handleCloseFullscreenMap = () => {
    setIsMapFullscreen(false);
    if (interactionMode === 'chat') {
      setActiveTab('chat');
    }
  };

  return (
    <div className="flex flex-col h-screen text-slate-100 bg-transparent overflow-hidden font-sans selection:bg-blue-600/30 selection:text-white relative">

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR: Clean & Crisp Dark Glass Header */}
      {/* ========================================================================= */}
      <header className="bg-slate-900/80 backdrop-blur-2xl border-b border-slate-700/60 px-3 sm:px-6 py-2.5 z-20 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* University Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-600/30 text-white ring-1 ring-white/20 shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate leading-tight flex items-center gap-1.5">
                Anna University
                <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold">
                  CENTRAL LIBRARY
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium truncate leading-tight">
                AI Research & 3D Wayfinding Assistant
              </p>
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-xs ml-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-beacon-green" />
              ONLINE
            </span>
          </div>

          {/* Mode Switcher (Centered & Refined) */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700/70 shadow-xs shrink-0 ring-1 ring-blue-500/20">
            <button 
              onClick={() => switchMode('voice')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold tab-pill ${
                interactionMode === 'voice' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Mic size={13} /> <span>Voice</span>
            </button>
            <button 
              onClick={() => switchMode('chat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold tab-pill ${
                interactionMode === 'chat' 
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <MessageSquare size={13} /> <span>Chat</span>
            </button>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Admin Return Button */}
            {(isAdmin || user?.role === 'admin') && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Return to Admin Dashboard"
              >
                <Shield size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Admin Portal</span>
                <ArrowRight size={12} className="text-amber-400" />
              </button>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/70 text-[11px] font-bold text-slate-200 shadow-xs">
              <div className="w-5 h-5 rounded-md bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center text-[10px] font-mono font-bold">
                {user?.username?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline max-w-[80px] truncate">{user?.username || 'Student'}</span>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/60 rounded-lg transition-all active:scale-95 border border-transparent hover:border-red-800/60 cursor-pointer" 
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
      <main className="flex-1 flex overflow-hidden relative max-w-7xl w-full mx-auto px-3 sm:px-6 py-2 sm:py-3 z-10">
        
        {/* ── VOICE MODE (Responsive Widescreen Dashboard) ── */}
        {interactionMode === 'voice' && (
          <div className="flex-1 flex flex-col justify-between w-full h-full overflow-y-auto custom-scrollbar animate-page-enter">
            
            {/* ════════════════════════════════════════════════════════════════ */}
            {/* UPPER HALF: Prominent 3D Voice Orb & Interactive Guidance    */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px] sm:min-h-[340px] py-1">
              
              {/* Single Top Title Banner */}
              {guestData ? (
                <div className="flex flex-col items-center text-center gap-2 shrink-0 mb-3 animate-fade-in-scale">
                  {/* High-Definition Center Guest Portrait */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 shadow-xl shadow-pink-500/30 shrink-0">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-950 flex items-center justify-center">
                      {guestData.image_url ? (
                        <img 
                          src={guestData.image_url} 
                          alt={guestData.name} 
                          className="w-full h-full object-cover object-top brightness-105 contrast-105 select-none" 
                        />
                      ) : (
                        <span className="font-black text-pink-300 text-xl">{guestData.name?.charAt(0)}</span>
                      )}
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Welcome to {systemProfile.library_name || 'Anna University Central Library'}, {guestData.name}!
                  </h2>
                  {guestData.about && (
                    <p className="text-xs sm:text-sm text-indigo-200 font-semibold max-w-xl">
                      {guestData.about}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-1 shrink-0 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-blue-300 text-[10px] font-bold shadow-xs backdrop-blur-md">
                    <Sparkles size={11} className="text-amber-400" />
                    <span>{systemProfile.agent_name || 'Sam'} · AI Library & Campus Intelligence Assistant</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    {systemProfile.greeting_message || 'How can I assist you today?'}
                  </h2>
                </div>
              )}

              {/* Prominent Center Orb Core */}
              <div className="relative flex items-center justify-center my-auto">
                <InteractiveVideoAvatar state={conversationState} onClick={handleOrbClick} size={280} />
              </div>

              {/* Instructional Flow Guidance */}
              <div className="flex flex-col items-center text-center gap-1 mt-2 shrink-0">
                <p className="text-[11px] sm:text-xs text-slate-300 font-medium flex items-center gap-2 bg-slate-900/85 border border-slate-700/80 px-4 py-1.5 rounded-full backdrop-blur-md shadow-md shadow-blue-950/40">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>Tap orb to start speaking · Tap again to finish & listen</span>
                </p>
              </div>

            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* LOWER HALF: Full-Height Live Voice Conversation Transcript   */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto min-h-[220px] sm:min-h-[260px] overflow-hidden py-1">
              
              {/* Live Conversation Voice Transcript Feed */}
              <div className="w-full h-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-700/80 shadow-2xl shadow-blue-950/60 p-4 sm:p-5 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Volume2 size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono block">
                        Live Voice Conversation
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Real-time dual acoustic transcription
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono font-bold px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 shadow-inner">
                    {conversationState}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                  {voiceMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-6 text-slate-500 text-center">
                      <Mic size={24} className="text-blue-400 mb-2 opacity-70 animate-pulse" />
                      <p className="text-xs sm:text-sm font-medium text-slate-400">Click the microphone orb above to speak...</p>
                      <p className="text-[11px] text-slate-500 mt-1">{systemProfile.agent_name || 'Sam'} will transcribe and respond live in clear English.</p>
                    </div>
                  ) : (
                    voiceMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`text-xs sm:text-sm flex items-start gap-2.5 ${
                          msg.role === 'user' ? 'text-blue-400 font-bold' : 'text-slate-200 font-medium'
                        }`}
                      >
                        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono text-slate-500 shrink-0 select-none mt-1 font-bold">
                          {msg.role === 'user' ? 'You:' : `${systemProfile.agent_name || 'Sam'}:`}
                        </span>
                        <div className={`flex-1 break-words rounded-2xl px-3.5 py-2 leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-blue-950/70 border border-blue-800/60 text-blue-200 font-semibold' 
                            : 'bg-slate-800/80 border border-slate-700/60 text-slate-200'
                        }`}>
                          {msg.interim && (
                            <span className="inline-block w-1.5 h-3.5 mr-1 bg-amber-400 animate-pulse align-middle" />
                          )}
                          {msg.content ? (
                            msg.content
                          ) : (
                            <span className="flex items-center gap-1.5 text-slate-400 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                              <span className="text-[11px] font-mono text-slate-400 ml-1">Thinking...</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>
              </div>

            </div>

            {/* Today's Active Campus Notices & Circulars Mini-Card */}
            {activeCirculars.length > 0 && (
              <div className="w-full max-w-4xl mx-auto bg-slate-900/85 backdrop-blur-xl rounded-2xl border border-slate-700/70 p-2.5 shadow-xs shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs">
                    <Megaphone size={13} className="text-blue-400 animate-bounce" />
                    <span>Today's Campus Circulars ({activeCirculars.length})</span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60 font-bold">
                    24h Live
                  </span>
                </div>
                <div className="space-y-1 max-h-[60px] overflow-y-auto custom-scrollbar pr-1">
                  {activeCirculars.map((ac) => (
                    <div key={ac.id} className="text-[10px] bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-200">{ac.title}</span>
                        <p className="text-slate-400 text-[9px] line-clamp-1 mt-0.5">{ac.content}</p>
                      </div>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60 shrink-0 uppercase font-mono">
                        {ac.category || 'NOTICE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-center flex-wrap gap-3 shrink-0 pt-2 pb-1">
              <button
                onClick={() => setIsMapFullscreen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-blue-500 text-xs font-bold text-slate-200 hover:text-white shadow-xs transition-all active:scale-[0.97] cursor-pointer"
              >
                <Compass size={15} className="text-blue-400" />
                <span>3D Campus Wayfinder</span>
              </button>
              <button
                onClick={() => switchMode('chat')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-indigo-500 text-xs font-bold text-slate-200 hover:text-white shadow-xs transition-all active:scale-[0.97] cursor-pointer"
              >
                <MessageSquare size={15} className="text-indigo-400" />
                <span>Switch to Text Chat</span>
              </button>
            </div>

          </div>
        )}

        {/* -------------------- CHAT MODE -------------------- */}
        {interactionMode === 'chat' && (
          <div className="flex-1 flex flex-col bg-slate-900/85 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-slate-700/70 shadow-2xl shadow-blue-950/50 overflow-hidden animate-page-enter">
            
            {/* Chat Header Tabs */}
            <div className="px-3 sm:px-5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30" />
                <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">AI Interactive Chat</span>
              </div>

              <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/70 shadow-xs">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold tab-pill ${
                    activeTab === 'chat' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare size={12} />
                  <span>Messages</span>
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold tab-pill ${
                    activeTab === 'search' 
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search size={12} />
                  <span>Catalog</span>
                </button>
                <button
                  onClick={() => setIsMapFullscreen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white tab-pill"
                >
                  <Map size={12} />
                  <span>3D Map</span>
                </button>
              </div>
            </div>

            {/* Chat Body & Viewports */}
            <div className="flex-1 relative overflow-hidden bg-transparent">
              
              {/* Messages View */}
              <div className={`absolute inset-0 flex flex-col ${activeTab !== 'chat' ? 'hidden' : 'flex'}`}>
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 transform-gpu will-change-scroll flex flex-col custom-scrollbar">
                  {chatMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-90 animate-[fadeInScale_0.5s_ease-out]">
                      <RobotLottieAvatar className="w-48 h-48 sm:w-56 sm:h-56" />
                      <h3 className="text-white font-extrabold text-lg mt-1">How can I help you today?</h3>
                      <p className="text-slate-400 font-medium text-xs mt-1.5 text-center max-w-[280px] leading-relaxed">
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
                        onShowRoute={handleShowDirectRoute}
                      />
                    ))
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/70">
                  <form onSubmit={handleTextSend} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask for books, authors, or directions (e.g. 'Where is AI rack?')..."
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-850 border border-slate-700/80 rounded-xl text-white text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
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
            ? 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none absolute -left-[9999px] -top-[9999px] w-1 h-1'
        }`}
      >
        <div className="flex-1 flex flex-col m-0 sm:m-3 bg-slate-900/90 backdrop-blur-2xl rounded-none sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-700/70">
          
          {/* Wayfinder Header Toolbar */}
          <div className="px-4 py-3 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between z-30 shrink-0 shadow-xs flex-wrap gap-2.5">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-600/20">
                <Compass className="animate-spin-slow" size={14} />
                <span>3D Indoor Wayfinder</span>
              </div>

              {/* Interactive Start Point & Destination Selectors */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded-xl shadow-xs flex-wrap">
                {/* START SELECTOR */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 font-mono">From:</span>
                  <select
                    value={routeFrom || 'entrance'}
                    onChange={(e) => setRouteFrom(e.target.value)}
                    className="bg-slate-800 text-slate-100 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {availableStarts.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SWAP BUTTON */}
                <button
                  onClick={handleSwapRoute}
                  disabled={!routeTo}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  title="Reverse start and destination"
                >
                  <ArrowRightLeft size={12} />
                </button>

                {/* DESTINATION SELECTOR */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 font-mono">To:</span>
                  <select
                    value={routeTo || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setRouteTo(e.target.value);
                      }
                    }}
                    className="bg-slate-800 text-amber-200 text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer max-w-[160px] sm:max-w-[200px] truncate"
                  >
                    <option value="" disabled>-- Select Rack / POI --</option>
                    {availableDestinations.map((dst) => (
                      <option key={dst.id} value={dst.id}>
                        {dst.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Floor Switcher */}
              <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/70 gap-0.5">
                <button
                  onClick={() => setActiveFloor('both')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeFloor === 'both' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Floors
                </button>
                {Array.from({ length: totalFloors }).map((_, i) => (
                  <button
                    key={i+1}
                    onClick={() => setActiveFloor(String(i+1))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeFloor === String(i+1) 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white'
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 transition-colors"
              >
                <X size={14} /> <span>Close</span>
              </button>
            </div>
          </div>

          {/* 3D Map Area */}
          <div className="flex-1 relative overflow-hidden bg-slate-950">
            <LibraryWayfinder 
              ref={wayfindRef}
              routeFrom={routeFrom}
              routeTo={routeTo} 
              activeFloor={activeFloor}
              onRackClick={handleRackClick}
              onRouteComplete={handleRouteComplete}
              onConfigLoaded={handleConfigLoaded}
            />

            {/* Turn-by-Turn Guidance Overlay */}
            {routeSteps.length > 0 && (
              <div className="absolute bottom-6 left-3 sm:left-6 max-w-sm bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-xl z-20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400 uppercase tracking-wider font-mono">
                  <Navigation size={13} /> Route Instructions
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-slate-200">
                  {routeSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs font-medium">
                      <CornerDownRight size={12} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-slate-900/80 backdrop-blur-md border-t border-slate-800/80 py-1.5 px-4 text-center shrink-0 z-20">
        <p className="text-[10px] text-slate-400 font-medium font-mono flex items-center justify-center gap-1.5">
          <span>ANNA UNIVERSITY CENTRAL LIBRARY AI SYSTEM</span>
          <span className="text-slate-600">|</span>
          <span>POWERED BY</span>
          <a 
            href="https://techwego.in/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-extrabold hover:underline"
          >
            Techwego
          </a>
        </p>
      </footer>

    </div>
  );
};

export default VoiceAssistant;
