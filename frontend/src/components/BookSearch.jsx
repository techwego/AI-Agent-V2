import React, { useState } from 'react';
import { Search, MapPin, Loader2, BookOpen } from 'lucide-react';
import { searchBooks } from '../api/client';

const BookSearch = ({ onShowOnMap }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await searchBooks({ query: query.trim() });
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
      <div className="p-5 border-b border-white/10 bg-black/20">
        <form onSubmit={handleSearch} className="flex gap-2 relative">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, topic, or keyword..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all shadow-inner"
            />
          </div>
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-2xl px-6 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-5 scroll-smooth overscroll-contain"
        style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}
      >
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <div className="text-center text-gray-500 mt-10">
            No results found. Try a different keyword.
          </div>
        )}

        {!loading && !error && results.length === 0 && !query && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60 mt-12">
            <BookOpen size={48} className="mb-4" />
            <p>Enter a query to search the library database</p>
          </div>
        )}

        <div className="space-y-4">
          {results.map((chunk, idx) => {
            const meta = chunk.metadata || {};
            const source = meta.source || 'Library Database';
            let rack = meta.Rack; 
            if (!rack && meta.section) {
              const match = meta.section.match(/Rack\s+([A-Z0-9]+)/i);
              if (match) rack = match[1];
            }
            if (!rack && chunk.text) {
               const match = chunk.text.match(/Rack:\s*([A-Z0-9]+)/i);
               if (match) rack = match[1];
            }

            return (
              <div key={idx} className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-blue-500/30 transition-colors group">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-300 text-lg">{meta.Title || source}</h3>
                    {meta.Author && <p className="text-sm text-gray-400">by {meta.Author}</p>}
                  </div>
                  {rack && (
                    <button 
                      onClick={() => onShowOnMap(rack)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 rounded-lg text-xs font-medium transition-colors border border-purple-500/20 shadow-sm"
                    >
                      <MapPin size={14} /> View Rack {rack}
                    </button>
                  )}
                </div>
                
                <p className="text-sm text-gray-300 leading-relaxed">
                  {chunk.text}
                </p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {meta.Category && (
                    <span className="px-2 py-1 bg-white/5 rounded-md text-xs text-gray-400 border border-white/5">
                      {meta.Category}
                    </span>
                  )}
                  {meta.document_type && (
                    <span className="px-2 py-1 bg-white/5 rounded-md text-xs text-gray-400 border border-white/5 uppercase">
                      {meta.document_type}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-white/5 rounded-md text-xs text-gray-400 border border-white/5">
                    Match Score: {(chunk.score * 100).toFixed(0)}%
                  </span>
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
