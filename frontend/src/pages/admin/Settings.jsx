import React, { useState, useEffect } from 'react';
import { getArchitecture, updateArchitecture } from '../../api/client';
import { Save, RefreshCw, Settings2, ShieldAlert, Clock, Book } from 'lucide-react';
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
          library_name: res.data.library_name || 'University Library',
          opening_hours: res.data.opening_hours || 'Mon-Fri: 8AM-8PM, Sat-Sun: 10AM-4PM',
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
      
      // Need to fetch current architecture first to preserve other fields
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
      showToast('Global settings updated! The AI has been synced.', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings2 className="text-blue-500" /> System Settings
          </h1>
          <p className="text-gray-400 mt-1">Configure global rules that the Voice AI must follow.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>Save Changes</span>
        </button>
      </div>
      
      <div className="glass-card rounded-2xl border border-gray-800 p-8 space-y-8">
        <div>
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Book className="text-purple-400" size={20} /> Library Identity
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Institution Name</label>
              <input 
                type="text" 
                name="library_name"
                value={settings.library_name} 
                onChange={handleChange}
                placeholder="e.g. Springfield University Library"
                className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-3 text-white transition-all outline-none" 
              />
              <p className="text-xs text-gray-500 mt-2">The AI will use this name when welcoming users.</p>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-800/50">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Clock className="text-amber-400" size={20} /> Operating Hours
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Schedule</label>
            <input 
              type="text" 
              name="opening_hours"
              value={settings.opening_hours} 
              onChange={handleChange}
              placeholder="e.g. Mon-Fri: 8AM-8PM, Sat-Sun: 10AM-4PM"
              className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-3 text-white transition-all outline-none" 
            />
            <p className="text-xs text-gray-500 mt-2">The AI will check these hours if students ask when the library closes.</p>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800/50">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="text-rose-400" size={20} /> Library Policies & Rules
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Borrowing Rules, Fees, and General Info</label>
            <textarea 
              name="library_policies"
              value={settings.library_policies} 
              onChange={handleChange}
              rows={5}
              placeholder="e.g. Students can borrow up to 3 books for 14 days. Late fees are $1/day..."
              className="w-full bg-gray-900 border border-gray-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg px-4 py-3 text-white transition-all outline-none resize-y" 
            />
            <p className="text-xs text-gray-500 mt-2">Inject these rules directly into the AI's core instructions. It will strictly enforce and reference these policies when answering questions.</p>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-800/50">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="text-emerald-400" size={20} /> AI Voice Customization
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Voice Persona</label>
            <select 
              name="voice_preset"
              value={settings.voice_preset || "en-US-AriaNeural"} 
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-3 text-white transition-all outline-none" 
            >
              <option value="en-US-AriaNeural">Aria (US Female) - Friendly, professional</option>
              <option value="en-US-GuyNeural">Guy (US Male) - Clear, authoritative</option>
              <option value="en-GB-SoniaNeural">Sonia (UK Female) - Calm, British accent</option>
              <option value="en-IN-NeerjaNeural">Neerja (India Female) - Warm, Indian accent</option>
              <option value="en-AU-NatashaNeural">Natasha (Australia Female) - Upbeat, Australian accent</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">Choose how the AI should sound when speaking to users.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
