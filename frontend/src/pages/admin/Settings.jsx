import React, { useState, useEffect, useCallback } from 'react';
import { getArchitecture, updateArchitecture } from '../../api/client';
import { 
  Save, RefreshCw, Settings2, ShieldAlert, Clock, Book, 
  Mic, Volume2, CheckCircle2, Sparkles, Building2, User, MessageSquare, Info, Wifi
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import ttsManager from '../../voice/SpeechSynthesisManager';

// Curated Feel-Good & Indian Voice Personas with Pallavi as #1
const CURATED_VOICES = [
  {
    group: '🇮🇳 Indian English (Female & Feel-Good)',
    options: [
      { id: 'en-IN-Pallavi', name: 'Pallavi (Indian Female · Natural & Warm)', desc: 'Official Microsoft Indian English Natural Voice (Recommended)' },
      { id: 'en-IN-Neerja', name: 'Neerja (Indian Female · Natural & Crisp)', desc: 'Clear South Asian academic tone' },
      { id: 'en-IN-Swara', name: 'Swara (Indian Female · Expressive & Friendly)', desc: 'Modern, engaging Indian university guide' },
      { id: 'en-IN-Heera', name: 'Heera (Indian Female · Clear & Articulate)', desc: 'Crisp, articulate library assistant' },
      { id: 'en-IN-Priya', name: 'Priya (Indian Female · Calm & Helpful)', desc: 'Gentle, clear and helpful assistant' },
      { id: 'en-IN-Kavya', name: 'Kavya (Indian Female · Professional)', desc: 'Fluent, friendly campus guide' }
    ]
  },
  {
    group: '🌍 International Feel-Good Personas (Female)',
    options: [
      { id: 'Google US English', name: 'Google US English (Chrome Female · Crisp & Clear)', desc: 'Official Google Chrome Clear Voice (Recommended)' },
      { id: 'Microsoft Zira', name: 'Microsoft Zira (Windows Female · Natural & Clear)', desc: 'Official Windows Natural Clear Voice' },
      { id: 'en-US-Jenny', name: 'Jenny (US Female · Warm & Cheerful)', desc: 'Upbeat and supportive assistant' },
      { id: 'en-US-Aria', name: 'Aria (US Female · Friendly & Modern)', desc: 'Smooth, highly natural AI companion' },
      { id: 'en-GB-Sonia', name: 'Sonia (UK Female · Formal & Elegant)', desc: 'Polished British academic accent' },
      { id: 'en-GB-Libby', name: 'Libby (UK Female · Melodic & Calm)', desc: 'Soothing, gentle storyteller tone' },
      { id: 'en-AU-Natasha', name: 'Natasha (Australian Female · Clear)', desc: 'Clear, modern international accent' }
    ]
  }
];

const Settings = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [systemVoices, setSystemVoices] = useState([]);
  
  const [settings, setSettings] = useState({
    college_name: 'Anna University',
    library_name: 'Anna University Central Library',
    agent_name: 'Sam',
    greeting_message: 'How can I assist you today?',
    opening_hours: 'Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM',
    library_policies: 'Students can borrow up to 3 books for 14 days.',
    additional_details: 'Wi-Fi is available across all reading halls. Quiet study zones are located on Floor 2.',
    voice_preset: 'en-IN-Pallavi'
  });

  // Load available browser voices
  useEffect(() => {
    const loadBrowserVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          setSystemVoices(voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en')));
        }
      }
    };

    loadBrowserVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadBrowserVoices;
    }
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getArchitecture();
      const savedLocalVoice = localStorage.getItem('preferred_voice');
      
      if (res.data) {
        const chosenVoice = savedLocalVoice || res.data.voice_preset || 'en-IN-Pallavi';
        setSettings({
          college_name: res.data.college_name || 'Anna University',
          library_name: res.data.library_name || 'Anna University Central Library',
          agent_name: res.data.agent_name || 'Sam',
          greeting_message: res.data.greeting_message || 'How can I assist you today?',
          opening_hours: res.data.opening_hours || 'Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM',
          library_policies: res.data.library_policies || 'Students can borrow up to 3 books for 14 days.',
          additional_details: res.data.additional_details || 'Wi-Fi is available across all reading halls. Quiet study zones are located on Floor 2.',
          voice_preset: chosenVoice
        });
        ttsManager.setVoice(chosenVoice);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    if (name === 'voice_preset') {
      ttsManager.setVoice(value);
    }
  };

  // Live Test Voice Sample
  const handleTestVoice = useCallback(() => {
    ttsManager.setVoice(settings.voice_preset);
    setTestingVoice(true);

    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    const testPhrase = `${greeting}! I am ${settings.agent_name || 'Sam'}, your AI Library Assistant at ${settings.library_name || 'Anna University'}. ${settings.greeting_message || 'How can I assist your research today?'}`;
    
    ttsManager.speak(testPhrase, () => {
      setTestingVoice(false);
    });
  }, [settings.voice_preset, settings.agent_name, settings.library_name, settings.greeting_message]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await getArchitecture();
      const currentConfig = res.data || {};
      
      const payload = {
        ...currentConfig,
        college_name: settings.college_name,
        library_name: settings.library_name,
        agent_name: settings.agent_name,
        greeting_message: settings.greeting_message,
        opening_hours: settings.opening_hours,
        library_policies: settings.library_policies,
        additional_details: settings.additional_details,
        voice_preset: settings.voice_preset
      };
      
      await updateArchitecture(payload);
      ttsManager.setVoice(settings.voice_preset);
      localStorage.setItem('preferred_voice', settings.voice_preset);
      localStorage.setItem('cached_voice_preset', settings.voice_preset);
      localStorage.setItem('cached_college_name', settings.college_name);
      localStorage.setItem('cached_library_name', settings.library_name);
      localStorage.setItem('cached_agent_name', settings.agent_name);
      localStorage.setItem('cached_greeting_message', settings.greeting_message);
      
      window.dispatchEvent(new Event('system-settings-change'));
      showToast('Settings saved & embedded into ChromaDB successfully!', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-page-enter">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings2 className="text-blue-600" /> Global System & Voice Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure university identity, agent persona, campus timings, rules, and natural voice.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{saving ? 'Saving & Embedding...' : 'Save All Settings'}</span>
        </button>
      </div>
      
      {/* Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        
        {/* 1. Voice Persona Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Mic className="text-purple-600" size={16} />
              <span>AI Voice Persona (Pallavi en-IN Speech Synthesis)</span>
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Sparkles size={12} /> Live Speech Engine Active
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Natural Voice Persona
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  name="voice_preset"
                  value={settings.voice_preset || "en-IN-Pallavi"} 
                  onChange={handleChange}
                  className="flex-1 bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs font-bold outline-none shadow-sm transition-all" 
                >
                  {CURATED_VOICES.map((cat, i) => (
                    <optgroup key={i} label={cat.group}>
                      {cat.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}

                  {/* Detected System Voices */}
                  {systemVoices.length > 0 && (
                    <optgroup label="💻 System & Browser Installed Voices">
                      {systemVoices.map((v, i) => (
                        <option key={i} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <button
                  type="button"
                  onClick={handleTestVoice}
                  disabled={testingVoice}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all shrink-0 cursor-pointer"
                >
                  <Volume2 size={15} className={testingVoice ? 'animate-bounce' : ''} />
                  <span>{testingVoice ? 'Speaking Sample...' : '🔊 Play Sample'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                This voice persona is strictly applied for the initial welcome greeting and all AI responses throughout the application.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Identity & Agent Configuration */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Building2 className="text-blue-600" size={16} />
            <span>Institution & AI Agent Identity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">College / University Name</label>
              <input 
                type="text" 
                name="college_name"
                value={settings.college_name} 
                onChange={handleChange}
                placeholder="e.g. Anna University / PSGiTech"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Library / Knowledge Center Full Title</label>
              <input 
                type="text" 
                name="library_name"
                value={settings.library_name} 
                onChange={handleChange}
                placeholder="e.g. Anna University Central Library"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">AI Assistant Name</label>
              <input 
                type="text" 
                name="agent_name"
                value={settings.agent_name} 
                onChange={handleChange}
                placeholder="e.g. Sam"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Greeting Headline Message</label>
              <input 
                type="text" 
                name="greeting_message"
                value={settings.greeting_message} 
                onChange={handleChange}
                placeholder="e.g. How can I assist you today?"
                className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all" 
              />
            </div>
          </div>
        </div>
        
        {/* 3. Operating Hours */}
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="text-amber-500" size={16} />
            <span>Library Operating Hours & Schedule</span>
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Standard Schedule / Timings</label>
            <input 
              type="text" 
              name="opening_hours"
              value={settings.opening_hours} 
              onChange={handleChange}
              placeholder="e.g. Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM"
              className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all" 
            />
            <p className="text-[11px] text-slate-400 mt-1">Embedded into vector memory so students asking about library timing receive instant accurate answers.</p>
          </div>
        </div>

        {/* 4. Library Policies & Rules */}
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <ShieldAlert className="text-indigo-600" size={16} />
            <span>Borrowing Rules, Loan Limits & Policies</span>
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Policy Context (Embedded in ChromaDB)</label>
            <textarea 
              name="library_policies"
              value={settings.library_policies} 
              onChange={handleChange}
              rows={3}
              placeholder="e.g. Students can borrow up to 3 books for 14 days. Renewal is available online. Overdue fine is Rs 2 per day."
              className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all resize-y" 
            />
          </div>
        </div>

        {/* 5. Additional Details & Facilities */}
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Wifi className="text-emerald-600" size={16} />
            <span>Campus Facilities, Wi-Fi & Additional Details</span>
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Facilities & Amenities Context</label>
            <textarea 
              name="additional_details"
              value={settings.additional_details} 
              onChange={handleChange}
              rows={3}
              placeholder="e.g. High-speed Wi-Fi is available across all reading halls. Quiet study zones are located on Floor 2. Digital library terminals on Floor 1."
              className="w-full bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all resize-y" 
            />
            <p className="text-[11px] text-slate-400 mt-1">Auto-embedded into ChromaDB vector database on save.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
