import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, BookOpen, Filter, RefreshCw } from 'lucide-react';
import { getBooks, createBook, updateBook, deleteBook } from '../../api/client';
import { useToast } from '../../components/Toast';

const Books = () => {
  const { showToast } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    title: '', author: '', department: '', rack: '', floor: '', copies: '1', available: '1', isbn: '', description: ''
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
    (book.author?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (book.rack?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalItems = filteredBooks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  const openAddModal = () => {
    setEditingBook(null);
    setFormData({
      title: '', author: '', department: '', rack: '', floor: '1', copies: '1', available: '1', isbn: '', description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title || '',
      author: book.author || '',
      department: book.department || '',
      rack: book.rack || '',
      floor: book.floor || '1',
      copies: String(book.copies || 1),
      available: String(book.available !== undefined ? book.available : book.copies || 1),
      isbn: book.isbn || '',
      description: book.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        copies: parseInt(formData.copies) || 1,
        available: parseInt(formData.available) || 1,
      };

      if (editingBook) {
        await updateBook(editingBook.id, payload);
        showToast('Book updated successfully', 'success');
      } else {
        await createBook(payload);
        showToast('Book added successfully', 'success');
      }
      setShowModal(false);
      fetchBooks();
    } catch (err) {
      console.error('Error saving book:', err);
      showToast(err.response?.data?.detail || 'Failed to save book', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBook(id);
      showToast('Book deleted successfully', 'success');
      setConfirmDelete(null);
      fetchBooks();
    } catch (err) {
      console.error('Error deleting book:', err);
      showToast('Failed to delete book', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="text-blue-600" /> Books & Shelf Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage physical book locations, floor codes, and shelf allocations.</p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={fetchBooks} 
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={openAddModal} 
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>Add New Book</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        
        {/* Search Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search catalog by title, author, or shelf rack code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">Book & Author</th>
                <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">3D Wayfinder Rack</th>
                <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider">Availability</th>
                <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                [...Array(8)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-3.5 bg-slate-200 rounded w-48 mb-1.5" /><div className="h-2.5 bg-slate-100 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 bg-slate-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 bg-slate-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 bg-slate-200 rounded w-12" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded w-14 ml-auto" /></td>
                  </tr>
                ))
              ) : currentBooks.length > 0 ? (
                currentBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900 text-xs">{book.title}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{book.author}</div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{book.department || '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {book.rack ? `Rack ${book.rack}` : '—'}
                      </span>
                      <div className="text-slate-400 text-[10px] mt-0.5">Floor {book.floor || '1'}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                        {book.available !== undefined ? book.available : book.copies} / {book.copies || 0} copies
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => openEditModal(book)} 
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(book.id)} 
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400 text-xs">
                    No books matched the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing <strong>{totalItems > 0 ? startIndex + 1 : 0}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> entries
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-sm transition-colors"
            >
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-800">
              {page} / {totalPages || 1}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0 || loading}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-sm transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                {editingBook ? 'Edit Book Record' : 'Add New Book to Catalog'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Book Title *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                  placeholder="e.g. Introduction to Algorithms" 
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Author *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.author} 
                  onChange={e => setFormData({...formData, author: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                  placeholder="e.g. Thomas H. Cormen" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Department</label>
                  <input 
                    type="text" 
                    value={formData.department} 
                    onChange={e => setFormData({...formData, department: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                    placeholder="Computer Science" 
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">ISBN / Call No.</label>
                  <input 
                    type="text" 
                    value={formData.isbn} 
                    onChange={e => setFormData({...formData, isbn: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                    placeholder="978-0262033848" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">3D Rack Location</label>
                  <input 
                    type="text" 
                    value={formData.rack} 
                    onChange={e => setFormData({...formData, rack: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                    placeholder="e.g. C4 or A1" 
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Floor Number</label>
                  <input 
                    type="text" 
                    value={formData.floor} 
                    onChange={e => setFormData({...formData, floor: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                    placeholder="1 or 2" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Available Copies</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.available} 
                    onChange={e => setFormData({...formData, available: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Total Stock</label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    value={formData.copies} 
                    onChange={e => setFormData({...formData, copies: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                  />
                </div>
              </div>
              
              <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{saving ? 'Saving...' : (editingBook ? 'Save Changes' : 'Create Book')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <h2 className="text-base font-bold text-slate-900 mb-2">Delete Book Record</h2>
            <p className="text-slate-500 text-xs mb-6">Are you sure you want to remove this book? It will be removed from the catalog and vector index.</p>
            <div className="flex gap-2.5 justify-end">
              <button 
                onClick={() => setConfirmDelete(null)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(confirmDelete)} 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-red-600/20 transition-all"
              >
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
