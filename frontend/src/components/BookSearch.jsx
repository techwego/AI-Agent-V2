import React, { useState } from 'react';
import { Search, MapPin, Loader2, BookOpen, CheckCircle2, Bookmark, Layers, Sparkles, Compass } from 'lucide-react';
import { searchBooks } from '../api/client';

const BookSearch = ({ onShowOnMap }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Department / Quick Topic Filter Pills
  const quickFilters = [
    'Artificial Intelligence', 'Data Science', 'Computer Networks', 
    'Quantum Physics', 'Machine Learning', 'Mathematics'
  ];

  const handleSearch = async (e, customTerm = null) => {
    if (e) e.preventDefault();
    const targetQuery = (customTerm !== null ? customTerm : query).trim();
    if (!targetQuery) return;

    if (customTerm !== null) {
      setQuery(customTerm);
    }

    setLoading(true);
    setError('');
    setSearchedQuery(targetQuery);
    
    try {
      const response = await searchBooks({ query: targetQuery });
      setResults(response.data.chunks || []);
    } catch (err) {
      setError('Failed to fetch search results. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-200/90 transition-all">
      
      {/* Search Bar Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <form onSubmit={handleSearch} className="flex gap-2 relative">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by book title, author, rack, or discipline..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-medium transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl px-5 flex items-center justify-center shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Search Catalog'}
          </button>
        </form>

        {/* Quick Discipline Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 custom-scrollbar">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1 font-semibold">
            <Sparkles size={10} className="text-amber-500" /> Topics:
          </span>
          {quickFilters.map((tag, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSearch(null, tag)}
              className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-semibold border border-slate-200/80 hover:border-blue-200 transition-all active:scale-95"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs text-center font-medium">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && searchedQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
            <BookOpen size={36} className="mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-xs">No exact matches found for "{searchedQuery}"</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try searching with broader author names, topics, or rack numbers.</p>
          </div>
        )}

        {!loading && !error && results.length === 0 && !searchedQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
            <BookOpen size={36} className="mb-2 text-blue-300" />
            <p className="font-semibold text-xs text-slate-600">Enter a book title, author, or rack code above to search</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">Connected to ChromaDB & SQLite Multi-Tier RAG</p>
          </div>
        )}

        {/* Results Header Summary */}
        {!loading && !error && results.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Found {results.length} {results.length === 1 ? 'item' : 'items'} for "{searchedQuery}"
            </span>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3">
          {results.map((chunk, idx) => {
            const meta = chunk.metadata || {};
            
            let title = meta.title || meta.Title || meta.book_name;
            if (!title || title.includes('.csv') || title.includes('.txt') || title.includes('.pdf')) {
              if (chunk.text) {
                const titleMatch = chunk.text.match(/Title:\s*(.*)/i);
                if (titleMatch) title = titleMatch[1].trim();
              }
            }
            if (!title || title.includes('.csv')) title = 'Library Catalog Item';

            let author = meta.author || meta.Author;
            if (!author && chunk.text) {
              const authMatch = chunk.text.match(/Author:\s*(.*)/i);
              if (authMatch) author = authMatch[1].trim();
            }

            let rack = meta.rack || meta.location || meta.Rack || meta.Location;
            if (!rack && chunk.text) {
              const rackMatch = chunk.text.match(/(?:Rack|Location):\s*([A-Z0-9\-]+)/i);
              if (rackMatch) rack = rackMatch[1].trim();
            }

            let copies = meta.copies || meta.copies_available || meta.Available;
            if (!copies && chunk.text) {
              const copiesMatch = chunk.text.match(/(?:Available Copies|Copies):\s*(\d+)/i);
              if (copiesMatch) copies = copiesMatch[1].trim();
            }

            let subject = meta.subject || meta.Subject || meta.category || meta.Category;
            if (!subject && chunk.text) {
              const subMatch = chunk.text.match(/Subject:\s*(.*)/i);
              if (subMatch) subject = subMatch[1].trim();
            }

            const numCopies = parseInt(copies, 10);
            const isAvailable = isNaN(numCopies) ? true : numCopies > 0;

            const rawScore = chunk.score != null ? chunk.score : 0.85;
            const scorePct = Math.round(rawScore <= 1.0 ? rawScore * 100 : Math.min(100, rawScore));
            const matchType = chunk.match_type || (scorePct >= 95 ? 'Exact Match' : 'Title Match');

            return (
              <div 
                key={idx} 
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all shadow-xs group interactive-card"
              >
                {/* Title & Location Action */}
                <div className="flex justify-between items-start gap-4">
                  
                  {/* Miniature 3D Book Spine Perspective & Metadata */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-12 rounded bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 border border-blue-400/40 book-spine-3d shrink-0 flex flex-col justify-between p-1 shadow-xs">
                      <div className="w-full h-1 bg-amber-300/90 rounded-full" />
                      <Bookmark size={12} className="text-white/90 self-center" />
                      <div className="w-full h-0.5 bg-white/50" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5 truncate">
                        <span className="truncate">{title}</span>
                      </h3>
                      {author && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          by <span className="text-slate-700 font-semibold">{author}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {rack && (
                    <button 
                      onClick={() => onShowOnMap(rack)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all border border-blue-200 shadow-xs active:scale-95 font-mono"
                    >
                      <Compass size={13} className="text-blue-600" />
                      <span>Rack {rack}</span>
                    </button>
                  )}
                </div>

                {/* Badges / Attribute Metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 font-mono ${
                    scorePct >= 90 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : scorePct >= 80 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <CheckCircle2 size={11} />
                    {matchType} ({scorePct}%)
                  </span>

                  {rack && (
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-200 font-mono">
                      📍 RACK {rack}
                    </span>
                  )}

                  {copies !== undefined && copies !== '' && (
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1.5 font-mono ${
                      isAvailable 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-beacon-green' : 'bg-rose-500 animate-beacon-coral'}`} />
                      {copies} AVAILABLE
                    </span>
                  )}

                  {subject && (
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium border border-slate-200 flex items-center gap-1">
                      <Layers size={11} className="text-slate-400" />
                      {subject}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BookSearch;
