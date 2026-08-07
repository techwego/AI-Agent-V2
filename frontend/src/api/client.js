import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-change'));
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getProfile = () => api.get('/auth/profile');
export const changePassword = (data) => api.put('/auth/change-password', data);

// Voice / Chat endpoints
// Chat uses streaming fetch usually, but this is for non-streaming or if we wrap fetch
export const sendChat = async (data) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(data)
  });
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
  }
  return response;
};

export const transcribeAudio = (formData) => api.post('/transcribe', formData);

export const searchBooks = (data) => api.post('/search', data);

// Admin endpoints
export const getBooks = () => api.get('/admin/books');
export const createBook = (data) => api.post('/admin/books', data);
export const updateBook = (id, data) => api.put(`/admin/books/${id}`, data);
export const deleteBook = (id) => api.delete(`/admin/books/${id}`);

export const getDepartments = () => api.get('/admin/departments');
export const createDepartment = (data) => api.post('/admin/departments', data);
export const updateDepartment = (id, data) => api.put(`/admin/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/admin/departments/${id}`);

export const getUsers = () => api.get('/admin/users');
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

export const uploadFile = (formData) => api.post('/admin/upload', formData);
export const getUploads = () => api.get('/admin/uploads');
export const deleteUpload = (id) => api.delete(`/admin/uploads/${id}`);
export const resetStuckUploads = () => api.post('/admin/uploads/reset-stuck');
export const deleteAllData = () => api.delete('/admin/uploads/delete-all');

export const getAnalytics = () => api.get('/admin/analytics');
export const getLogs = () => api.get('/admin/logs');
export const getSystemStatus = () => api.get('/admin/system-status');
export const blockUser = (id) => api.put(`/admin/users/${id}/block`);
export const unblockUser = (id) => api.put(`/admin/users/${id}/unblock`);

export default api;
