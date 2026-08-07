import React, { useState, useEffect } from 'react';
import { BookOpen, Building, UploadCloud, Users, Database, Server, Mic, HardDrive, Activity, RefreshCw, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAnalytics, getLogs, getSystemStatus } from '../../api/client';
import { useToast } from '../../components/Toast';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle, isLoading }) => (
  <div className="glass-card p-6 rounded-2xl flex items-start justify-between border border-gray-800">
    <div>
      <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
      {isLoading ? (
        <div className="h-9 w-24 bg-gray-800 rounded animate-pulse mb-2"></div>
      ) : (
        <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>
      )}
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-xl ${colorClass}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const StatusBadge = ({ label, status, icon: Icon, isLoading }) => {
  const isOnline = status === 'online';
  return (
    <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-gray-400" />
        <span className="font-medium text-gray-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="h-4 w-16 bg-gray-800 rounded animate-pulse"></div>
        ) : (
          <>
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
            <span className="text-sm text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
          </>
        )}
      </div>
    </div>
  );
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

const getActivityIcon = (action) => {
  switch (action?.toLowerCase()) {
    case 'upload': return <UploadCloud size={16} className="text-blue-400" />;
    case 'delete': return <Activity size={16} className="text-red-400" />;
    case 'update': return <RefreshCw size={16} className="text-amber-400" />;
    case 'create': return <BookOpen size={16} className="text-green-400" />;
    default: return <Activity size={16} className="text-gray-400" />;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [analyticsRes, statusRes] = await Promise.all([
        getAnalytics(),
        getSystemStatus()
      ]);
      setAnalytics(analyticsRes.data);
      setSystemStatus(statusRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      showToast('Failed to fetch dashboard data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getSystemStatusVal = (key) => {
    if (!systemStatus || !systemStatus.systems) return 'offline';
    return systemStatus.systems[key] || 'offline';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome to the Library AI Management system.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button 
            onClick={() => navigate('/admin/analytics')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-colors"
          >
            View Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Books" 
          value={analytics?.total_books || 0} 
          icon={BookOpen} 
          colorClass="bg-blue-600 shadow-lg shadow-blue-900/40" 
          isLoading={loading}
        />
        <StatCard 
          title="Departments" 
          value={analytics?.total_departments || 0} 
          icon={Building} 
          colorClass="bg-purple-600 shadow-lg shadow-purple-900/40" 
          isLoading={loading}
        />
        <StatCard 
          title="Uploaded Files" 
          value={analytics?.total_uploads || 0} 
          icon={UploadCloud} 
          colorClass="bg-green-600 shadow-lg shadow-green-900/40" 
          isLoading={loading}
        />
        <StatCard 
          title="Active Users" 
          value={analytics?.active_users || 0} 
          icon={Users} 
          colorClass="bg-amber-600 shadow-lg shadow-amber-900/40" 
          subtitle={analytics?.today_queries ? `${analytics.today_queries} queries today` : ''}
          isLoading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse flex-shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-gray-800 rounded animate-pulse w-1/4"></div>
                  </div>
                </div>
              ))
            ) : analytics?.recent_activity?.length > 0 ? (
              analytics.recent_activity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 hover:bg-gray-800/50 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 flex-shrink-0">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200">
                      <span className="font-medium text-white">{activity.admin_name}</span> {activity.action} <span className="font-medium text-blue-400">{activity.details}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No recent activity found.</p>
            )}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-gray-800 flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-6">System Status</h2>
          <div className="space-y-4 flex-1">
            <StatusBadge label="Main Database" status={getSystemStatusVal('database')} icon={Database} isLoading={loading} />
            <StatusBadge label="Vector DB (Qdrant)" status={getSystemStatusVal('vector_db')} icon={Server} isLoading={loading} />
            <StatusBadge label="RAG Engine" status={getSystemStatusVal('rag_engine')} icon={HardDrive} isLoading={loading} />
            <StatusBadge label="Voice Agent API" status={getSystemStatusVal('voice_api')} icon={Mic} isLoading={loading} />
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-800">
            {loading ? (
              <div className="h-8 bg-gray-800 rounded animate-pulse"></div>
            ) : (
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Uptime</p>
                  <p className="text-white font-medium">{systemStatus?.uptime || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">Memory Usage</p>
                  <p className="text-white font-medium">{systemStatus?.memory_usage || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
