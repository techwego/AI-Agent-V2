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
    <div className="flex flex-col h-full bg-slate-50/50 rounded-2xl overflow-hidden transition-all">
      
      {/* Search Bar Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <form onSubmit={handleSearch} className="flex gap-2 relative">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by book title, author, rack, or category..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-medium transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl px-5 flex items-center justify-center shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Search Catalog'}
          </button>
        </form>
      </div>

      {/* Main Results Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs text-center font-medium">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && searchedQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
            <BookOpen size={36} className="mb-2 text-slate-300" />
            <p className="font-bold text-slate-700 text-xs">No exact matches found for "{searchedQuery}"</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try searching with broader author names or topics.</p>
          </div>
        )}

        {!loading && !error && results.length === 0 && !searchedQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
            <BookOpen size={36} className="mb-2 text-blue-300" />
            <p className="font-semibold text-xs text-slate-600">Enter a book title, author, or rack code above to search</p>
          </div>
        )}

        {/* Results Header Summary */}
        {!loading && !error && results.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
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

            const rawScore = chunk.score != null ? chunk.score : 0.85;
            const scorePct = Math.round(rawScore <= 1.0 ? rawScore * 100 : Math.min(100, rawScore));
            const matchType = chunk.match_type || (scorePct >= 95 ? 'Exact Match' : 'Title Match');

            return (
              <div 
                key={idx} 
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all shadow-sm group"
              >
                {/* Title & Location Action */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5 truncate">
                      <Bookmark size={15} className="text-blue-600 shrink-0" />
                      <span className="truncate">{title}</span>
                    </h3>
                    {author && (
                      <p className="text-xs text-slate-500 mt-0.5 pl-5">
                        by <span className="text-slate-700 font-semibold">{author}</span>
                      </p>
                    )}
                  </div>

                  {rack && (
                    <button 
                      onClick={() => onShowOnMap(rack)}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all border border-blue-200 shadow-sm active:scale-95"
                    >
                      <MapPin size={13} className="text-blue-600" />
                      <span>View Rack {rack}</span>
                    </button>
                  )}
                </div>

                {/* Badges / Attribute Metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
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
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-200">
                      📍 Rack {rack}
                    </span>
                  )}

                  {copies !== undefined && copies !== '' && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold border border-slate-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {copies} Available
                    </span>
                  )}

                  {subject && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium border border-slate-200 flex items-center gap-1">
                      <Layers size={11} />
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
