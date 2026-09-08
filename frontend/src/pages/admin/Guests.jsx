import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, UploadCloud, Trash2, Edit3, CheckCircle2, 
  Sparkles, RefreshCw, Volume2, Power, Eye, EyeOff, User, X, Copy, AlertTriangle
} from 'lucide-react';
import { 
  getAdminGuests, createGuest, updateGuest, deleteGuest, 
  toggleGuestCards, getArchitecture, duplicateGuest, toggleGuestStatus
} from '../../api/client';
import { useToast } from '../../components/Toast';
import ttsManager from '../../voice/SpeechSynthesisManager';

const Guests = () => {
  const { showToast } = useToast();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCardsOnLogin, setShowCardsOnLogin] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Edit Modal State
  const [editingGuest, setEditingGuest] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editGreeting, setEditGreeting] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Delete & Action State
  const [guestToDelete, setGuestToDelete] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const [guestsRes, archRes] = await Promise.all([
        getAdminGuests(),
        getArchitecture()
      ]);
      setGuests(guestsRes.data || []);
      setShowCardsOnLogin(Boolean(archRes.data?.show_guest_cards));
    } catch (err) {
      console.error('Failed to fetch guests:', err);
      showToast('Failed to load guest profiles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const handleImageChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      if (isEdit) {
        setEditImageFile(file);
        setEditImagePreview(URL.createObjectURL(file));
      } else {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleToggleCards = async () => {
    try {
      setTogglingVisibility(true);
      const res = await toggleGuestCards();
      setShowCardsOnLogin(res.data.show_guest_cards);
      showToast(res.data.message || 'Updated login page guest cards visibility', 'success');
    } catch (err) {
      showToast('Failed to toggle guest cards visibility', 'error');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleToggleGuestStatus = async (guest) => {
    try {
      setActionLoadingId(guest.id);
      const res = await toggleGuestStatus(guest.id);
      showToast(res.data?.message || 'Updated guest status', 'success');
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, is_active: res.data.is_active } : g));
    } catch (err) {
      showToast('Failed to toggle guest status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (guest) => {
    try {
      setActionLoadingId(guest.id);
      const res = await duplicateGuest(guest.id);
      showToast(res.data?.message || `Duplicated "${guest.name}" in disabled mode`, 'success');
      fetchGuests();
    } catch (err) {
      showToast('Failed to duplicate guest profile', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter guest name', 'error');
      return;
    }
    if (!greetingMessage.trim()) {
      showToast('Please enter a welcome greeting message for the voice AI', 'error');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('about', about.trim());
    formData.append('greeting_message', greetingMessage.trim());
    if (imageFile) formData.append('image', imageFile);

    try {
      await createGuest(formData);
      showToast('Guest profile & custom voice greeting created successfully!', 'success');
      setName('');
      setAbout('');
      setGreetingMessage('');
      setImageFile(null);
      setImagePreview(null);
      fetchGuests();
    } catch (err) {
      console.error('Error creating guest:', err);
      showToast(err.response?.data?.detail || 'Failed to create guest profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (guest) => {
    setEditingGuest(guest);
    setEditName(guest.name || '');
    setEditAbout(guest.about || '');
    setEditGreeting(guest.greeting_message || '');
    setEditImagePreview(guest.image_url || null);
    setEditImageFile(null);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Please enter guest name', 'error');
      return;
    }

    setEditSaving(true);
    const formData = new FormData();
    formData.append('name', editName.trim());
    formData.append('about', editAbout.trim());
    formData.append('greeting_message', editGreeting.trim());
    if (editImageFile) formData.append('image', editImageFile);

    try {
      await updateGuest(editingGuest.id, formData);
      showToast('Guest profile updated successfully!', 'success');
      setEditingGuest(null);
      fetchGuests();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update guest', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!guestToDelete) return;
    try {
      setActionLoadingId(guestToDelete.id);
      await deleteGuest(guestToDelete.id);
      showToast(`Deleted guest profile "${guestToDelete.name}"`, 'success');
      setGuests(prev => prev.filter(g => g.id !== guestToDelete.id));
      setGuestToDelete(null);
    } catch (err) {
      showToast('Failed to delete guest profile', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTestSpeech = (text) => {
    if (!text) return;
    ttsManager.speak(text);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold mb-2">
            <HeartHandshake size={14} />
            <span>VIP & Distinguished Guests</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            Guest Visit Welcome System
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Register dignitaries, visiting researchers, and campus guests. Their personalized welcome card will appear on the login screen, triggering an automated spoken voice AI greeting when selected.
          </p>
        </div>

        {/* Global Toggle Switch */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-700/80 p-3.5 rounded-2xl shrink-0">
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-white">Login Page Guest Cards</span>
            <span className="text-[10px] text-slate-400">
              {showCardsOnLogin ? 'Cards visible to all visitors' : 'Disabled (Standard login page)'}
            </span>
          </div>
          <button
            onClick={handleToggleCards}
            disabled={togglingVisibility}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
              showCardsOnLogin ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                showCardsOnLogin ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Guest Directory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Create Guest Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Sparkles className="text-blue-600" size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Add New Guest Profile</h2>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            
            {/* Photo Upload with Live Preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Guest Photo / Portrait
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-slate-400" size={24} />
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <div className="border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 text-center transition-colors bg-slate-50/50 hover:bg-blue-50/30">
                    <UploadCloud className="mx-auto text-slate-400 mb-1" size={18} />
                    <span className="text-xs font-semibold text-slate-600">Choose Image</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 5MB</p>
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, false)} className="hidden" />
                </label>
              </div>
            </div>

            {/* Guest Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name & Title <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. A.P.J. Abdul Kalam / Prof. Sarah Jenkins"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* About / Designation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designation / Affiliation
              </label>
              <input 
                type="text"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="e.g. Renowned Scientist · Former President of India"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Voice AI Welcome Greeting */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Voice AI Welcome Greeting <span className="text-red-500">*</span>
                </label>
                {greetingMessage && (
                  <button 
                    type="button" 
                    onClick={() => handleTestSpeech(greetingMessage)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 size={11} />
                    <span>Preview Voice</span>
                  </button>
                )}
              </div>
              <textarea 
                required
                rows={3}
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                placeholder="e.g. A very warm welcome to Anna University Central Library, Dr. Kalam! We are deeply honored to host you today. Feel free to ask me for any book, research paper, or campus directions."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                This exact greeting will be spoken out loud by the Voice Assistant in natural audio when the guest taps their card.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              <span>Save Guest Profile</span>
            </button>
          </form>
        </div>

        {/* Right Column: Registered Guest Profiles */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HeartHandshake className="text-pink-600" size={18} />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Registered Guests ({guests.length})
                </h2>
              </div>
              <button 
                onClick={fetchGuests}
                disabled={loading}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : guests.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl">
                <User className="mx-auto text-slate-300 mb-2" size={32} />
                <h3 className="text-sm font-bold text-slate-700">No Guest Profiles Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Add visiting guests, keynote speakers, or researchers using the form to give them an exclusive AI voice greeting on arrival.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                {guests.map((guest) => (
                  <div 
                    key={guest.id}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 p-0.5 shadow-md shrink-0">
                        {guest.image_url ? (
                          <img 
                            src={guest.image_url} 
                            alt={guest.name} 
                            className="w-full h-full object-cover object-top rounded-[14px]" 
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-800 rounded-[14px] flex items-center justify-center text-white font-black text-base">
                            {guest.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {guest.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleToggleGuestStatus(guest)}
                            disabled={actionLoadingId === guest.id}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                              guest.is_active
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300'
                            }`}
                            title={guest.is_active ? 'Click to Disable Guest Card' : 'Click to Enable Guest Card'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${guest.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span>{guest.is_active ? 'Active' : 'Disabled'}</span>
                          </button>
                        </div>
                        {guest.about && (
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {guest.about}
                          </p>
                        )}
                        {guest.greeting_message && (
                          <p className="text-[10px] text-indigo-600/90 italic truncate mt-1 bg-indigo-50/60 px-2 py-0.5 rounded-md border border-indigo-100/80">
                            "{guest.greeting_message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {guest.greeting_message && (
                        <button
                          onClick={() => handleTestSpeech(guest.greeting_message)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                          title="Play Welcome Voice Greeting"
                        >
                          <Volume2 size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicate(guest)}
                        disabled={actionLoadingId === guest.id}
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                        title="Duplicate Guest (Creates copy in disabled mode)"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => openEditModal(guest)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => setGuestToDelete(guest)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-colors cursor-pointer"
                        title="Delete Profile"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>When enabled, cards render dynamically on the campus kiosk login portal.</span>
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-fade-in-scale relative">
            <button 
              onClick={() => setEditingGuest(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Edit Guest: {editingGuest.name}
            </h3>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {editImagePreview ? (
                    <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-slate-400" size={24} />
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <div className="border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 text-center transition-colors bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-600">Change Photo</span>
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, true)} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation / Affiliation</label>
                <input 
                  type="text"
                  value={editAbout}
                  onChange={(e) => setEditAbout(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Voice AI Greeting</label>
                <textarea 
                  rows={3}
                  value={editGreeting}
                  onChange={(e) => setEditGreeting(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom In-App Delete Confirmation Modal */}
      {guestToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-fade-in-scale relative">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Delete Guest Profile?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action will permanently remove the profile and voice greeting.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                {guestToDelete.image_url ? (
                  <img src={guestToDelete.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-600">
                    {guestToDelete.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{guestToDelete.name}</p>
                {guestToDelete.about && <p className="text-[10px] text-slate-500 truncate">{guestToDelete.about}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setGuestToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoadingId === guestToDelete.id}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {actionLoadingId === guestToDelete.id ? <RefreshCw className="animate-spin" size={13} /> : <Trash2 size={13} />}
                <span>Delete Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Guests;
