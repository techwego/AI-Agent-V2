import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Mic, Send, Volume2 } from 'lucide-react';
import Map3D from '../components/Map3D';
import { sendChat } from '../api/client';

const VoiceAssistant = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Library Assistant. How can I help you find a book today?' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [routeTo, setRouteTo] = useState(null);
  const messagesEndRef = useRef(null);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processResponse = async (text) => {
    // Check for ROUTE_TO tag
    const routeMatch = text.match(/\[ROUTE_TO:([A-Z])\]/);
    if (routeMatch) {
      setRouteTo(routeMatch[1]);
      text = text.replace(/\[ROUTE_TO:([A-Z])\]/g, '').trim();
    }
    return text;
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSpeaking(true);

    try {
      const response = await sendChat({ message: userMessage });
      
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let fullResponse = '';

      // Add a placeholder message for the assistant
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullResponse;
            return newMessages;
          });
        }
      }

      await processResponse(fullResponse);
      
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsSpeaking(false);
    }
  };

  const toggleListen = () => {
    // In a real app, this would start the MediaRecorder and send to /api/transcribe
    setIsListening(!isListening);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <header className="glass flex items-center justify-between px-6 py-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <Volume2 size={18} />
          </div>
          <h1 className="text-xl font-bold">Library <span className="text-gradient">AI</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700">
            <User size={16} className="text-gray-400" />
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: 3D Map & Orb */}
        <div className="w-1/2 flex flex-col p-6 gap-6">
          <div className="flex-1 relative glass-card rounded-2xl overflow-hidden border border-gray-800/50 flex flex-col">
            <div className="absolute top-4 left-4 z-10">
              <div className="px-3 py-1 rounded-full bg-gray-900/80 backdrop-blur border border-gray-700 text-xs font-semibold text-gray-300">
                Live Map
              </div>
            </div>
            <Map3D routeTo={routeTo} />
          </div>

          <div className="h-64 glass-card rounded-2xl flex items-center justify-center border border-gray-800/50 relative overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
            
            {/* The Orb */}
            <div 
              className={`orb-container ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
              onClick={toggleListen}
            >
              <Mic size={40} className={`text-white opacity-80 ${isListening ? 'animate-pulse' : ''}`} />
            </div>
            
            <div className="absolute bottom-4 text-sm text-gray-500">
              {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Click orb to speak'}
            </div>
          </div>
        </div>

        {/* Right Panel: Chat */}
        <div className="w-1/2 flex flex-col p-6 pl-0">
          <div className="flex-1 glass-card rounded-2xl flex flex-col border border-gray-800/50 overflow-hidden relative">
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-sm'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-900 border-t border-gray-800">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about a book, topic, or location..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors shadow-lg shadow-blue-900/50"
                >
                  <Send size={18} className="ml-1" />
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
