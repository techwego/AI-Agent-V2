import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAnalytics } from '../../api/client';
import { BookOpen, Users, Building2, MessageSquare, UploadCloud, UserCheck, RefreshCw } from 'lucide-react';

const data = [
  { name: 'Jan', queries: 0 },
  { name: 'Feb', queries: 0 },
  { name: 'Mar', queries: 0 },
  { name: 'Apr', queries: 0 },
  { name: 'May', queries: 0 },
  { name: 'Jun', queries: 0 },
];

const StatCard = ({ title, value, icon: Icon, colorClass, isLoading }) => (
  <div className={`glass-card rounded-2xl border border-gray-800 p-6 flex items-center space-x-4`}>
    <div className={`p-4 rounded-xl bg-opacity-20 ${colorClass.bg} ${colorClass.text}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {isLoading ? (
        <div className="h-8 w-20 bg-gray-800 rounded animate-pulse mt-1"></div>
      ) : (
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      )}
    </div>
  </div>
);

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const stats1 = [
    { title: 'Total Books', value: analytics?.total_books || 0, icon: BookOpen, colorClass: { bg: 'bg-blue-500/20', text: 'text-blue-500' } },
    { title: 'Total Users', value: analytics?.total_users || 0, icon: Users, colorClass: { bg: 'bg-purple-500/20', text: 'text-purple-500' } },
    { title: 'Total Departments', value: analytics?.total_departments || 0, icon: Building2, colorClass: { bg: 'bg-green-500/20', text: 'text-green-500' } },
    { title: 'Today\'s Queries', value: analytics?.today_queries || 0, icon: MessageSquare, colorClass: { bg: 'bg-amber-500/20', text: 'text-amber-500' } },
  ];

  const stats2 = [
    { title: 'Total Uploads', value: analytics?.total_uploads || 0, icon: UploadCloud, colorClass: { bg: 'bg-rose-500/20', text: 'text-rose-500' } },
    { title: 'Active Users', value: analytics?.active_users || 0, icon: UserCheck, colorClass: { bg: 'bg-cyan-500/20', text: 'text-cyan-500' } },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">System Analytics</h1>
        <button 
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats1.map((stat, i) => (
          <StatCard key={i} {...stat} isLoading={loading} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats2.map((stat, i) => (
          <StatCard key={i} {...stat} isLoading={loading} />
        ))}
      </div>
      
      <div className="glass-card rounded-2xl border border-gray-800 p-6 h-96 relative">
        <h3 className="text-lg font-medium text-white mb-6">Voice Queries Over Time</h3>
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/60 rounded-2xl backdrop-blur-sm">
          <div className="bg-gray-800 px-6 py-3 rounded-lg border border-gray-700 shadow-xl">
            <p className="text-gray-200 font-medium flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></span>
              Time-series data collection in progress
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
            <Line type="monotone" dataKey="queries" stroke="#3b82f6" strokeWidth={2} isAnimationActive={false} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
