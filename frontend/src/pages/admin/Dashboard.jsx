import React from 'react';
import { BookOpen, Building, UploadCloud, Users, Database, Server, Mic, HardDrive } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <div className="glass-card p-6 rounded-2xl flex items-start justify-between border border-gray-800">
    <div>
      <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-xl ${colorClass}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const StatusBadge = ({ label, status, icon: Icon }) => {
  const isOnline = status === 'online';
  return (
    <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-gray-400" />
        <span className="font-medium text-gray-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
        <span className="text-sm text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome to the Library AI Management system.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg border border-gray-700 transition-colors">
            View Analytics
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-colors">
            Upload Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Books" value="12,453" icon={BookOpen} colorClass="bg-blue-600 shadow-lg shadow-blue-900/40" subtitle="+124 this week" />
        <StatCard title="Departments" value="18" icon={Building} colorClass="bg-purple-600 shadow-lg shadow-purple-900/40" subtitle="Across 3 campuses" />
        <StatCard title="Uploaded Files" value="342" icon={UploadCloud} colorClass="bg-green-600 shadow-lg shadow-green-900/40" subtitle="Last: 2 hours ago" />
        <StatCard title="Active Users" value="2,194" icon={Users} colorClass="bg-amber-600 shadow-lg shadow-amber-900/40" subtitle="+42 today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 p-3 hover:bg-gray-800/50 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-800/50 flex-shrink-0">
                  <User size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-200"><span className="font-medium text-white">Admin User</span> uploaded <span className="font-medium text-blue-400">engineering_books_q3.csv</span></p>
                  <p className="text-xs text-gray-500 mt-1">{i * 2} hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-gray-800 flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-6">System Status</h2>
          <div className="space-y-4 flex-1">
            <StatusBadge label="Main Database" status="online" icon={Database} />
            <StatusBadge label="Vector DB (Qdrant)" status="online" icon={Server} />
            <StatusBadge label="Embedding Service" status="online" icon={HardDrive} />
            <StatusBadge label="Voice Agent API" status="online" icon={Mic} />
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-800">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Storage Used</span>
              <span className="text-white font-medium">45.2 GB / 100 GB</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// Quick helper to make icon available in the map above
const User = Users;
