import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { getBooks } from '../../api/client';

const Books = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // In a real app, we would fetch from API
    // getBooks().then(res => setBooks(res.data)).finally(() => setLoading(false));
    
    // Mock data for display
    setTimeout(() => {
      setBooks([
        { id: 1, title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', department: 'Computer Science', rack: 'A', status: 'Available' },
        { id: 2, title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell', department: 'Computer Science', rack: 'B', status: 'Checked Out' },
        { id: 3, title: 'Advanced Engineering Mathematics', author: 'Erwin Kreyszig', department: 'Mathematics', rack: 'C', status: 'Available' },
        { id: 4, title: 'Physics for Scientists and Engineers', author: 'Raymond A. Serway', department: 'Physics', rack: 'D', status: 'Available' },
        { id: 5, title: 'Design of Everyday Things', author: 'Don Norman', department: 'Design', rack: 'E', status: 'Reserved' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Books Management</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-colors">
          <Plus size={16} /> Add Book
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-gray-800 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search books by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg border border-gray-700 transition-colors">
            <Filter size={16} /> Filters
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/80 sticky top-0 z-10 backdrop-blur-sm border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-400">Title & Author</th>
                <th className="px-6 py-4 font-medium text-gray-400">Department</th>
                <th className="px-6 py-4 font-medium text-gray-400">Location</th>
                <th className="px-6 py-4 font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 font-medium text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                // Skeletons
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div><div className="h-3 bg-gray-800 rounded w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-800 rounded-full w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-800 rounded w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{book.title}</div>
                      <div className="text-gray-400 mt-0.5">{book.author}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{book.department}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-gray-800 text-gray-300 text-xs font-medium border border-gray-700">
                        Rack {book.rack}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        book.status === 'Available' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        book.status === 'Checked Out' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {book.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors">
                          <Edit size={16} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-800 flex items-center justify-between text-sm text-gray-400 bg-gray-900/50">
          <span>Showing 1 to 5 of 12,453 entries</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white">Prev</button>
            <button className="px-3 py-1 rounded bg-blue-600 text-white">1</button>
            <button className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white">2</button>
            <button className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Books;
