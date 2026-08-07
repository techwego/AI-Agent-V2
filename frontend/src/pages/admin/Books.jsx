import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, BookOpen, Filter } from 'lucide-react';
import { getBooks, createBook, updateBook, deleteBook } from '../../api/client';
import { useToast } from '../../components/Toast';

const Books = () => {
  const { showToast } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    title: '', author: '', department: '', rack: '', floor: '', copies: '', isbn: ''
  });
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const itemsPerPage = 20;

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await getBooks();
      setBooks(res.data || res || []);
    } catch (err) {
      console.error('Error fetching books:', err);
      showToast('Failed to fetch books', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const filteredBooks = books.filter(book => 
    (book.title?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (book.author?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalItems = filteredBooks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  const openAddModal = () => {
    setEditingBook(null);
    setFormData({ title: '', author: '', department: '', rack: '', floor: '', copies: '', isbn: '' });
    setShowModal(true);
  };

  const openEditModal = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title || '',
      author: book.author || '',
      department: book.department || '',
      rack: book.rack || '',
      floor: book.floor || '',
      copies: book.copies || '',
      isbn: book.isbn || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, copies: Number(formData.copies) || 0 };
      if (editingBook) {
        await updateBook(editingBook.id, data);
      } else {
        await createBook(data);
      }
      setShowModal(false);
      fetchBooks();
    } catch (err) {
      console.error('Error saving book:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBook(id);
      setConfirmDelete(null);
      fetchBooks();
    } catch (err) {
      console.error('Error deleting book:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="text-blue-500" /> Books Management
        </h1>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-colors">
          <Plus size={16} /> Add Book
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-gray-800 flex-1 flex flex-col overflow-hidden bg-gray-900/30">
        <div className="p-4 border-b border-gray-800 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search books by title or author..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset page on search
              }}
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
                <th className="px-6 py-4 font-medium text-gray-400">Copies</th>
                <th className="px-6 py-4 font-medium text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                // Skeletons
                [...Array(10)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div><div className="h-3 bg-gray-800 rounded w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-20 mb-1"></div><div className="h-3 bg-gray-800 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-800 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : currentBooks.length > 0 ? (
                currentBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{book.title}</div>
                      <div className="text-gray-400 mt-0.5">{book.author}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{book.department || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">Rack {book.rack || '-'}</div>
                      <div className="text-gray-500 text-xs">Floor {book.floor || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-gray-800 text-gray-300 text-xs font-medium border border-gray-700">
                        {book.available !== undefined ? book.available : book.copies} / {book.copies || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(book)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="Edit Book">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => setConfirmDelete(book.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete Book">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No books found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between text-sm text-gray-400 bg-gray-900/50">
          <span>
            Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} entries
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-gray-800 text-white transition-colors"
            >
              Prev
            </button>
            <div className="flex items-center px-2 text-white font-medium">
              {page}
            </div>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0 || loading}
              className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-gray-800 text-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingBook ? 'Edit Book' : 'Add New Book'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Enter book title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Author</label>
                <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Enter author name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Department</label>
                  <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Computer Science" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">ISBN</label>
                  <input type="text" value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="ISBN number" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Rack</label>
                  <input type="text" value={formData.rack} onChange={e => setFormData({...formData, rack: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. A1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Floor</label>
                  <input type="text" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. 1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Copies</label>
                  <input required type="number" min="0" value={formData.copies} onChange={e => setFormData({...formData, copies: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  {editingBook ? 'Save Changes' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white mb-4">Confirm Delete</h2>
            <p className="text-gray-300 mb-6">Are you sure you want to delete this book? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;
