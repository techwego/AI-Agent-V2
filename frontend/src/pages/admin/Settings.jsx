import React, { useState, useEffect, useCallback } from 'react';
import { getArchitecture, updateArchitecture } from '../../api/client';
import { Save, RefreshCw, Settings2, ShieldAlert, Clock, Book, Mic, Volume2, CheckCircle2, Sparkles } from 'lucide-react';
import { useToast } from '../../components/Toast';
import ttsManager from '../../voice/SpeechSynthesisManager';

// Curated Feel-Good & Indian Voice Personas
const CURATED_VOICES = [
  {
    group: '🇮🇳 Indian English (Female & Feel-Good)',
    options: [
      { id: 'en-IN-Neerja', name: 'Neerja (Indian Female · Natural & Warm)', desc: 'Soft, polite, clear South Asian academic tone (Recommended)' },
      { id: 'en-IN-Swara', name: 'Swara (Indian Female · Expressive & Friendly)', desc: 'Modern, engaging Indian university guide' },
      { id: 'en-IN-Heera', name: 'Heera (Indian Female · Clear & Articulate)', desc: 'Crisp, articulate library assistant' },
      { id: 'en-IN-Priya', name: 'Priya (Indian Female · Calm & Helpful)', desc: 'Gentle, clear and helpful assistant' },
      { id: 'en-IN-Kavya', name: 'Kavya (Indian Female · Professional)', desc: 'Fluent, friendly campus guide' }
    ]
  },
  {
    group: '🌍 International Feel-Good Personas (Female)',
    options: [
      { id: 'en-US-Aria', name: 'Aria (US Female · Friendly & Modern)', desc: 'Smooth, highly natural AI companion' },
      { id: 'en-US-Jenny', name: 'Jenny (US Female · Warm & Cheerful)', desc: 'Upbeat and supportive assistant' },
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
    library_name: '',
    opening_hours: '',
    library_policies: '',
    voice_preset: 'en-IN-Neerja'
  });

  // Load available browser voices
  useEffect(() => {
    const loadBrowserVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          setSystemVoices(voices.filter(v => v.lang.startsWith('en') || v.lang.includes('IN')));
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
        const chosenVoice = savedLocalVoice || res.data.voice_preset || 'en-IN-Neerja';
        setSettings({
          library_name: res.data.library_name || 'Anna University Central Library',
          opening_hours: res.data.opening_hours || 'Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM',
          library_policies: res.data.library_policies || 'Students can borrow up to 3 books for 14 days.',
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

    const testPhrase = `${greeting}! I am Sam, your AI Library Assistant at ${settings.library_name || 'Anna University'}. How can I assist your research today?`;
    
    ttsManager.speak(testPhrase, () => {
      setTestingVoice(false);
    });
  }, [settings.voice_preset, settings.library_name]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await getArchitecture();
      const currentConfig = res.data || {};
      
      const payload = {
        ...currentConfig,
        library_name: settings.library_name,
        opening_hours: settings.opening_hours,
        library_policies: settings.library_policies,
        voice_preset: settings.voice_preset
      };
      
      await updateArchitecture(payload);
      ttsManager.setVoice(settings.voice_preset);
      showToast('Voice & system settings updated successfully!', 'success');
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
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings2 className="text-blue-600" /> Global System & Voice Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure university branding, campus schedule, and natural AI voice personas.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-600/20 transition-all"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>Save All Settings</span>
        </button>
      </div>
      
      {/* Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        
        {/* Voice Persona Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Mic className="text-purple-600" size={16} />
              <span>AI Voice Persona (Full Conversation Voice)</span>
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Sparkles size={12} /> Applied to Greetings & All Responses
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Natural Feel-Good Voice Persona
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  name="voice_preset"
                  value={settings.voice_preset || "en-IN-Neerja"} 
                  onChange={handleChange}
                  className="flex-1 bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none shadow-sm transition-all" 
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
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all shrink-0"
                >
                  <Volume2 size={15} className={testingVoice ? 'animate-bounce' : ''} />
                  <span>{testingVoice ? 'Speaking Sample...' : '🔊 Play Sample'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                This voice will strictly be used for the initial welcome greeting ("Good morning / Good evening...") and all answers throughout the session.
              </p>
            </div>
          </div>
        </div>

        {/* Institution Identity */}
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Book className="text-blue-600" size={16} />
            <span>Institution Identity</span>
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Institution / Library Full Title</label>
            <input 
              type="text" 
              name="library_name"
              value={settings.library_name} 
              onChange={handleChange}
              placeholder="e.g. Anna University Central Library"
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all" 
            />
            <p className="text-[11px] text-slate-400 mt-1">The AI greets users and identifies itself with this name.</p>
          </div>
        </div>
        
        {/* Operating Hours */}
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="text-amber-500" size={16} />
            <span>Operating Hours</span>
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Schedule</label>
            <input 
              type="text" 
              name="opening_hours"
              value={settings.opening_hours} 
              onChange={handleChange}
              placeholder="e.g. Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM"
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all" 
            />
            <p className="text-[11px] text-slate-400 mt-1">The AI references these hours when students ask when the library opens or closes.</p>
          </div>
        </div>

        {/* Library Policies */}
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <ShieldAlert className="text-indigo-600" size={16} />
            <span>Borrowing Rules & General Policies</span>
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Context (Injected into RAG)</label>
            <textarea 
              name="library_policies"
              value={settings.library_policies} 
              onChange={handleChange}
              rows={4}
              placeholder="e.g. Students can borrow up to 3 books for 14 days. Renewal is available online..."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium outline-none transition-all resize-y" 
            />
            <p className="text-[11px] text-slate-400 mt-1">Injected into system instructions for student inquiries on fines, renewals, and memberships.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
