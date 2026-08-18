import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Upload, 
  Building, 
  Users, 
  BarChart3, 
  ScrollText, 
  Settings, 
  LogOut,
  Layers
} from 'lucide-react';

const AdminLayout = () => {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Architecture', path: '/admin/architecture', icon: Layers },
    { name: 'Books', path: '/admin/books', icon: BookOpen },
    { name: 'Upload Dataset', path: '/admin/upload', icon: Upload },
    { name: 'Departments', path: '/admin/departments', icon: Building },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Logs', path: '/admin/logs', icon: ScrollText },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-gray-800 flex flex-col z-20 relative">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">Admin <span className="text-gradient">Panel</span></h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_0_12px_rgba(59,130,246,0.1)]' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
        {/* Background ambient effects */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
