import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

import LoginPage from './pages/LoginPage';
import VoiceAssistant from './pages/VoiceAssistant';
import Profile from './pages/user/Profile';

import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Books from './pages/admin/Books';
import Upload from './pages/admin/Upload';
import Departments from './pages/admin/Departments';
import Users from './pages/admin/Users';
import Analytics from './pages/admin/Analytics';
import Logs from './pages/admin/Logs';
import Settings from './pages/admin/Settings';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-4">
          <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
          <p className="text-gray-400 text-sm max-w-md text-center">{this.state.error?.message}</p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/voice" />;
  return children;
};

const App = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;
  }

  return (
    <ErrorBoundary>
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            !isAuthenticated ? <Navigate to="/login" /> : 
            isAdmin ? <Navigate to="/admin/dashboard" /> : 
            <Navigate to="/voice" />
          } 
        />
        
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/voice" element={
          <ProtectedRoute>
            <VoiceAssistant />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="books" element={<Books />} />
          <Route path="upload" element={<Upload />} />
          <Route path="departments" element={<Departments />} />
          <Route path="users" element={<Users />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
    </ErrorBoundary>
  );
};

export default App;
