import React, { useState } from 'react';
import { Search, MapPin, Loader2, BookOpen, CheckCircle2, Bookmark, Layers } from 'lucide-react';
import { searchBooks } from '../api/client';

const BookSearch = ({ onShowOnMap }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setError('');
    setSearchedQuery(cleanQuery);
    
    try {
      const response = await searchBooks({ query: cleanQuery });
      setResults(response.data.chunks || []);
    } catch (err) {
      setError('Failed to fetch search results. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-md transition-all duration-500">
      {/* Search Bar Header */}
      <div className="p-5 border-b border-white/10 bg-black/30">
        <form onSubmit={handleSearch} className="flex gap-2 relative">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by book title, author, rack, or keyword..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-gray-400 focus:outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all shadow-inner"
            />
          </div>
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-medium text-sm rounded-2xl px-6 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Search Catalog'}
          </button>
        </form>
      </div>

      {/* Main Results Container */}
      <div 
        className="flex-1 overflow-y-auto p-5 scroll-smooth overscroll-contain"
        style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}
      >
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm text-center shadow-lg">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && searchedQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center">
            <BookOpen size={44} className="mb-3 opacity-40 text-gray-500" />
            <p className="font-semibold text-gray-300">No exact matches found for "{searchedQuery}"</p>
            <p className="text-xs text-gray-500 mt-1">Try searching with a broader title or author name.</p>
          </div>
        )}

        {!loading && !error && results.length === 0 && !searchedQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center opacity-60">
            <BookOpen size={48} className="mb-3 text-blue-400/60" />
            <p className="font-medium text-sm">Enter a book title, author, or rack code above to search</p>
          </div>
        )}

        {/* Results Header Summary */}
        {!loading && !error && results.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Found {results.length} {results.length === 1 ? 'result' : 'results'} for "{searchedQuery}"
            </span>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-4">
          {results.map((chunk, idx) => {
            const meta = chunk.metadata || {};
            
            // Clean Title (never fallback to raw filenames)
            let title = meta.title || meta.Title || meta.book_name;
            if (!title || title.includes('.csv') || title.includes('.txt') || title.includes('.pdf')) {
              if (chunk.text) {
                const titleMatch = chunk.text.match(/Title:\s*(.*)/i);
                if (titleMatch) title = titleMatch[1].strip();
              }
            }
            if (!title || title.includes('.csv')) title = 'Library Catalog Item';

            // Clean Author
            let author = meta.author || meta.Author;
            if (!author && chunk.text) {
              const authMatch = chunk.text.match(/Author:\s*(.*)/i);
              if (authMatch) author = authMatch[1].trim();
            }

            // Clean Rack / Location
            let rack = meta.rack || meta.location || meta.Rack || meta.Location;
            if (!rack && chunk.text) {
              const rackMatch = chunk.text.match(/(?:Rack|Location):\s*([A-Z0-9\-]+)/i);
              if (rackMatch) rack = rackMatch[1].trim();
            }

            // Clean Copies
            let copies = meta.copies || meta.copies_available || meta.Available;
            if (!copies && chunk.text) {
              const copiesMatch = chunk.text.match(/(?:Available Copies|Copies):\s*(\d+)/i);
              if (copiesMatch) copies = copiesMatch[1].trim();
            }

            // Clean Subject / Category
            let subject = meta.subject || meta.Subject || meta.category || meta.Category;
            if (!subject && chunk.text) {
              const subMatch = chunk.text.match(/Subject:\s*(.*)/i);
              if (subMatch) subject = subMatch[1].trim();
            }

            // Normalized Score (Scale to percentage)
            const rawScore = chunk.score != null ? chunk.score : 0.85;
            const scorePct = Math.round(rawScore <= 1.0 ? rawScore * 100 : Math.min(100, rawScore));
            const matchType = chunk.match_type || (scorePct >= 95 ? 'Exact Match' : 'Title Match');

            return (
              <div 
                key={idx} 
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-blue-500/40 transition-all duration-300 shadow-lg group relative overflow-hidden"
              >
                {/* Top Bar: Title, Author & Map Action */}
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors flex items-center gap-2">
                      <Bookmark size={18} className="text-blue-400 flex-shrink-0" />
                      {title}
                    </h3>
                    {author && (
                      <p className="text-xs font-medium text-gray-400 mt-1 pl-6">
                        by <span className="text-gray-200">{author}</span>
                      </p>
                    )}
                  </div>

                  {rack && (
                    <button 
                      onClick={() => onShowOnMap(rack)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/50 hover:to-blue-600/50 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-purple-500/30 shadow-md hover:shadow-purple-500/20 active:scale-95"
                    >
                      <MapPin size={14} className="text-purple-400 animate-bounce" style={{ animationDuration: '2s' }} />
                      View Rack {rack}
                    </button>
                  )}
                </div>

                {/* Badges / Attribute Metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  {/* Match Score Badge */}
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                    scorePct >= 90 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : scorePct >= 80 
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                      : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                  }`}>
                    <CheckCircle2 size={12} />
                    {matchType} ({scorePct}%)
                  </span>

                  {/* Rack Location Badge */}
                  {rack && (
                    <span className="px-2.5 py-1 bg-purple-500/15 text-purple-300 rounded-lg text-xs font-medium border border-purple-500/20 flex items-center gap-1">
                      📍 Rack {rack}
                    </span>
                  )}

                  {/* Available Copies Badge */}
                  {copies !== undefined && copies !== '' && (
                    <span className="px-2.5 py-1 bg-white/5 text-gray-300 rounded-lg text-xs font-medium border border-white/10 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {copies} {parseInt(copies, 10) === 1 ? 'Copy' : 'Copies'} Available
                    </span>
                  )}

                  {/* Subject Badge */}
                  {subject && (
                    <span className="px-2.5 py-1 bg-white/5 text-gray-400 rounded-lg text-xs font-medium border border-white/5 flex items-center gap-1">
                      <Layers size={12} />
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
