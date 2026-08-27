import React, { useState, useEffect } from 'react';
import { BookOpen, Building2, UploadCloud, Users, Database, Server, Mic, HardDrive, Activity, RefreshCw, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAnalytics, getLogs, getSystemStatus } from '../../api/client';
import { useToast } from '../../components/Toast';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle, isLoading }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
      {isLoading ? (
        <div className="h-8 w-20 bg-slate-100 rounded animate-pulse my-1.5" />
      ) : (
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
      )}
      {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-2xl ${colorClass}`}>
      <Icon size={22} className="text-white" />
    </div>
  </div>
);

const StatusBadge = ({ label, status, icon: Icon, isLoading }) => {
  const isOnline = status === 'online';
  return (
    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200/60">
          <Icon size={16} />
        </div>
        <span className="font-semibold text-xs text-slate-800">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
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
    case 'upload': return <UploadCloud size={15} className="text-blue-600" />;
    case 'delete': return <Activity size={15} className="text-red-600" />;
    case 'update': return <RefreshCw size={15} className="text-amber-600" />;
    case 'create': return <BookOpen size={15} className="text-emerald-600" />;
    default: return <Activity size={15} className="text-slate-600" />;
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time status of library catalog, vector index, and AI query engine.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>
          <button 
            onClick={() => navigate('/admin/analytics')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
          >
            <span>View Full Analytics</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Indexed Books" 
          value={analytics?.total_books || 0} 
          icon={BookOpen} 
          colorClass="bg-blue-600 shadow-md shadow-blue-500/20" 
          isLoading={loading}
        />
        <StatCard 
          title="Departments" 
          value={analytics?.total_departments || 0} 
          icon={Building2} 
          colorClass="bg-indigo-600 shadow-md shadow-indigo-500/20" 
          isLoading={loading}
        />
        <StatCard 
          title="Vector Datasets" 
          value={analytics?.total_uploads || 0} 
          icon={UploadCloud} 
          colorClass="bg-emerald-600 shadow-md shadow-emerald-500/20" 
          isLoading={loading}
        />
        <StatCard 
          title="Active Queries" 
          value={analytics?.active_users || 0} 
          icon={Users} 
          colorClass="bg-amber-600 shadow-md shadow-amber-500/20" 
          subtitle={analytics?.today_queries ? `${analytics.today_queries} queries today` : 'RAG Active'}
          isLoading={loading}
        />
      </div>

      {/* Main Grid: Activity & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Admin Activity</h2>
            <span className="text-[11px] text-slate-400 font-medium">Audit Trail</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="h-2 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : analytics?.recent_activity?.length > 0 ? (
              analytics.recent_activity.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 font-medium truncate">
                      <strong className="text-slate-900 font-semibold">{activity.admin_name}</strong> {activity.action} <span className="text-blue-600 font-semibold">{activity.details}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No recent activity recorded.
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-5">System Architecture Health</h2>
            <div className="space-y-3">
              <StatusBadge label="SQLite Relational DB" status={getSystemStatusVal('database')} icon={Database} isLoading={loading} />
              <StatusBadge label="ChromaDB / Vector Store" status={getSystemStatusVal('vector_db')} icon={Server} isLoading={loading} />
              <StatusBadge label="Groq RAG LLM Pipeline" status={getSystemStatusVal('rag_engine')} icon={HardDrive} isLoading={loading} />
              <StatusBadge label="Speech-to-Speech Engine" status={getSystemStatusVal('voice_api')} icon={Mic} isLoading={loading} />
            </div>
          </div>
          
          <div className="mt-6 pt-5 border-t border-slate-100">
            {loading ? (
              <div className="h-6 bg-slate-100 rounded animate-pulse" />
            ) : (
              <div className="flex justify-between items-center text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Server Uptime</p>
                  <p className="text-slate-800 font-bold mt-0.5">{systemStatus?.uptime || 'Online'}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-medium">RAM Footprint</p>
                  <p className="text-slate-800 font-bold mt-0.5">{systemStatus?.memory_usage || 'Optimal'}</p>
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
