import React, { useState, useEffect } from 'react';
import { getArchitecture, updateArchitecture } from '../../api/client';
import { Save, RefreshCw, Settings2, ShieldAlert, Clock, Book, Mic } from 'lucide-react';
import { useToast } from '../../components/Toast';

const Settings = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    library_name: '',
    opening_hours: '',
    library_policies: '',
    voice_preset: 'en-US-AriaNeural'
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getArchitecture();
      if (res.data) {
        setSettings({
          library_name: res.data.library_name || 'Anna University Central Library',
          opening_hours: res.data.opening_hours || 'Mon-Fri: 8:00 AM - 8:00 PM, Sat: 9:00 AM - 5:00 PM',
          library_policies: res.data.library_policies || 'Students can borrow up to 3 books for 14 days.',
          voice_preset: res.data.voice_preset || 'en-US-AriaNeural'
        });
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
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await getArchitecture();
      const currentConfig = res.data;
      
      const payload = {
        ...currentConfig,
        library_name: settings.library_name,
        opening_hours: settings.opening_hours,
        library_policies: settings.library_policies,
        voice_preset: settings.voice_preset
      };
      
      await updateArchitecture(payload);
      showToast('Global settings updated and synced with Voice AI!', 'success');
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
            <Settings2 className="text-blue-600" /> Global System Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure campus entity names, library schedule, and AI voice personas.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-600/20 transition-all"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>Save Settings</span>
        </button>
      </div>
      
      {/* Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        
        {/* Institution Identity */}
        <div>
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
        
        {/* Voice Persona */}
        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Mic className="text-purple-600" size={16} />
            <span>AI Voice Accent & Persona</span>
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Speech Synthesis Voice</label>
            <select 
              name="voice_preset"
              value={settings.voice_preset || "en-US-AriaNeural"} 
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold outline-none transition-all" 
            >
              <option value="en-US-AriaNeural">Aria (US Female) - Friendly, clear & academic</option>
              <option value="en-IN-NeerjaNeural">Neerja (India Female) - Clear, natural Indian accent</option>
              <option value="en-GB-SoniaNeural">Sonia (UK Female) - Formal British tone</option>
              <option value="en-US-GuyNeural">Guy (US Male) - Authoritative & professional</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">Select the natural audio voice for client-side TTS synthesis.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
