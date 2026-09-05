import React, { useState, useEffect } from 'react';
import { 
  Bell, UploadCloud, Calendar, Clock, Trash2, FileText, CheckCircle2, 
  AlertCircle, Sparkles, Megaphone, RefreshCw, Layers, ShieldAlert, Timer
} from 'lucide-react';
import { uploadCircular, getAdminCirculars, deleteCircular, purgeExpiredCirculars } from '../../api/client';
import { useToast } from '../../components/Toast';

const Circulars = () => {
  const { showToast } = useToast();
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Leave');
  const [eventDate, setEventDate] = useState('');
  const [expireHours, setExpireHours] = useState(24);
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);

  const fetchCirculars = async () => {
    try {
      const res = await getAdminCirculars();
      setCirculars(res.data || []);
    } catch (err) {
      console.error('Failed to fetch circulars:', err);
      showToast('Failed to load circulars', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
    const interval = setInterval(fetchCirculars, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter a circular title', 'error');
      return;
    }
    if (!content.trim() && !file) {
      showToast('Please enter circular details or upload a document file', 'error');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('category', category);
    formData.append('event_date', eventDate || new Date().toISOString().split('T')[0]);
    formData.append('expire_hours', expireHours);
    if (content.trim()) formData.append('content', content.trim());
    if (file) formData.append('file', file);

    try {
      const res = await uploadCircular(formData);
      showToast(res.data?.message || 'Circular published & embedded successfully!', 'success');
      setTitle('');
      setContent('');
      setEventDate('');
      setFile(null);
      fetchCirculars();
    } catch (err) {
      console.error('Error publishing circular:', err);
      showToast(err.response?.data?.detail || 'Failed to publish circular', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, circTitle) => {
    if (!window.confirm(`Are you sure you want to delete circular "${circTitle}"?`)) return;
    try {
      await deleteCircular(id);
      showToast('Circular deleted and removed from vector store', 'success');
      setCirculars(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      showToast('Failed to delete circular', 'error');
    }
  };

  const handlePurge = async () => {
    try {
      const res = await purgeExpiredCirculars();
      showToast(res.data?.message || 'Expired circulars purged', 'success');
      fetchCirculars();
    } catch (err) {
      showToast('Failed to purge expired circulars', 'error');
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'leave':
      case 'holiday':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'event':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'exam':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-page-enter">
      
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5">
              <Megaphone size={13} className="text-blue-600" />
              <span>Campus Broadcast System</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1.5">
              <Timer size={13} className="text-amber-600" />
              <span>24-Hour Auto-Expiry</span>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Campus Circulars, Leave & Event Notices
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Publish official announcements. Documents are auto-chunked, embedded into ChromaDB, and delivered live by AI Assistant Sam.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchCirculars}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handlePurge}
            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
          >
            <Trash2 size={14} />
            <span>Purge Expired</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload / Publish Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <UploadCloud size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Publish New Circular</h3>
              <p className="text-xs text-slate-400">Creates instant ChromaDB vector embedding</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Circular / Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tomorrow College Leave Announcement / Annual Tech Symposium"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>

            {/* Category & Expiry Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold bg-white"
                >
                  <option value="Leave">Leave / Holiday</option>
                  <option value="Event">Campus Event</option>
                  <option value="Exam">Exam Notice</option>
                  <option value="General">General Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Auto-Expiry Duration
                </label>
                <select
                  value={expireHours}
                  onChange={(e) => setExpireHours(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold bg-white"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Default)</option>
                  <option value={48}>48 Hours (2 Days)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Event / Leave Date
              </label>
              <input
                type="text"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                placeholder="e.g. Tomorrow (6th Sept) or 2026-09-06"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Circular Content & Announcement Details
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter circular announcement text, timing details, affected departments, or instructions..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium resize-none"
              />
            </div>

            {/* Document Upload (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attach Document File (PDF / DOCX / TXT)
              </label>
              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center">
                  <FileText size={22} className="text-slate-400 mb-1" />
                  {file ? (
                    <span className="text-xs font-bold text-blue-600 truncate max-w-xs">{file.name}</span>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-slate-700">Click to upload official notice document</span>
                      <span className="text-[11px] text-slate-400">PDF, Word, or Text (Auto-extracted & chunked)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Publish Circular & Build Embeddings</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* Right Column: Active Circulars Table & Live Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Live Circulars List Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Active Campus Announcements</h3>
                  <p className="text-xs text-slate-400">Currently live in AI voice memory</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                {circulars.filter(c => c.is_active).length} Active
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs font-medium">Loading campus circulars...</p>
              </div>
            ) : circulars.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 p-6">
                <Megaphone size={32} className="mx-auto mb-2 text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">No active circulars</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Publish a circular on the left. The AI assistant will automatically announce it to students who interact with the assistant today.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {circulars.map((c) => (
                  <div 
                    key={c.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      c.is_active 
                        ? 'bg-slate-50/60 border-slate-200/90 hover:bg-slate-50' 
                        : 'bg-slate-100/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getCategoryColor(c.category)}`}>
                            {c.category}
                          </span>
                          <span className="text-xs font-bold text-slate-900 leading-snug">
                            {c.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-1">
                          {c.content}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(c.id, c.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        title="Delete circular"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center gap-3">
                        {c.event_date && (
                          <span className="flex items-center gap-1 text-slate-600 font-semibold">
                            <Calendar size={12} className="text-blue-600" />
                            <span>Date: {c.event_date}</span>
                          </span>
                        )}
                        {c.source_filename && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <FileText size={12} />
                            <span className="truncate max-w-[120px]">{c.source_filename}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Timer size={12} className={c.is_active ? 'text-amber-500' : 'text-slate-400'} />
                        <span className={c.is_active ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                          {c.is_active ? `Expires in ${c.hours_left}h` : 'Expired'}
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

          {/* AI Student Experience Preview Box */}
          <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-white p-5 rounded-3xl border border-blue-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-blue-600" />
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider font-mono">
                Student Live Voice Experience Preview
              </h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              When a new student opens the Voice Assistant or asks <em className="font-semibold text-blue-800">"What are today's circulars?"</em> or <em className="font-semibold text-blue-800">"Is tomorrow a holiday/leave?"</em>, AI Sam will automatically retrieve active announcements and speak the event details clearly.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Circulars;
