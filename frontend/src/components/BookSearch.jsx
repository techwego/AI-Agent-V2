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
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-700/80 transition-all">
      
      {/* Search Bar Header */}
      <div className="p-4 border-b border-slate-700/60 bg-slate-950/80">
        <form onSubmit={handleSearch} className="flex gap-2 relative">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by book title, author, rack, or discipline..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 font-medium transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl px-5 flex items-center justify-center shadow-lg shadow-sky-500/25 transition-all active:scale-95 border border-white/10"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Search Catalog'}
          </button>
        </form>

        {/* Quick Discipline Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 custom-scrollbar">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Sparkles size={10} className="text-amber-400" /> Topics:
          </span>
          {quickFilters.map((tag, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSearch(null, tag)}
              className="shrink-0 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-300 rounded-lg text-[10px] font-medium border border-slate-700/80 hover:border-sky-500/40 transition-all active:scale-95"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {error && (
          <div className="bg-red-950/60 border border-red-500/40 text-red-300 p-4 rounded-2xl text-xs text-center font-medium">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && searchedQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
            <BookOpen size={36} className="mb-2 text-slate-600" />
            <p className="font-bold text-slate-300 text-xs">No exact matches found for "{searchedQuery}"</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Try searching with broader author names, topics, or rack numbers.</p>
          </div>
        )}

        {!loading && !error && results.length === 0 && !searchedQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
            <BookOpen size={36} className="mb-2 text-sky-500/50" />
            <p className="font-semibold text-xs text-slate-300">Enter a book title, author, or rack code above to search</p>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">Connected to ChromaDB & SQLite Multi-Tier RAG</p>
          </div>
        )}

        {/* Results Header Summary */}
        {!loading && !error && results.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
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
                className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700/80 hover:border-sky-400/50 hover:shadow-lg hover:shadow-sky-950/40 transition-all shadow-md group interactive-card"
              >
                {/* Title & Location Action */}
                <div className="flex justify-between items-start gap-4">
                  
                  {/* Miniature 3D Book Spine Perspective & Metadata */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-12 rounded bg-gradient-to-br from-sky-600 via-indigo-700 to-slate-900 border border-sky-400/40 book-spine-3d shrink-0 flex flex-col justify-between p-1 shadow-md">
                      <div className="w-full h-1 bg-amber-400/80 rounded-full" />
                      <Bookmark size={12} className="text-white/80 self-center" />
                      <div className="w-full h-0.5 bg-white/40" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-white text-sm group-hover:text-sky-300 transition-colors flex items-center gap-1.5 truncate">
                        <span className="truncate">{title}</span>
                      </h3>
                      {author && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          by <span className="text-slate-200 font-semibold">{author}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {rack && (
                    <button 
                      onClick={() => onShowOnMap(rack)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded-xl text-xs font-bold transition-all border border-sky-500/40 shadow-sm active:scale-95 font-mono"
                    >
                      <Compass size={13} className="text-sky-400" />
                      <span>Rack {rack}</span>
                    </button>
                  )}
                </div>

                {/* Badges / Attribute Metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-800">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 font-mono ${
                    scorePct >= 90 
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' 
                      : scorePct >= 80 
                      ? 'bg-sky-950/80 text-sky-400 border-sky-500/40' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    <CheckCircle2 size={11} />
                    {matchType} ({scorePct}%)
                  </span>

                  {rack && (
                    <span className="px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 rounded-md text-[10px] font-bold border border-indigo-500/40 font-mono">
                      📍 RACK {rack}
                    </span>
                  )}

                  {copies !== undefined && copies !== '' && (
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1.5 font-mono ${
                      isAvailable 
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-beacon-green' : 'bg-rose-400 animate-beacon-coral'}`} />
                      {copies} AVAILABLE
                    </span>
                  )}

                  {subject && (
                    <span className="px-2.5 py-0.5 bg-slate-800/90 text-slate-300 rounded-md text-[10px] font-medium border border-slate-700 flex items-center gap-1">
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
