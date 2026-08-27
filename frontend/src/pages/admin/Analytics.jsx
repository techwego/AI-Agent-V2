import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAnalytics } from '../../api/client';
import { BookOpen, Users, Building2, MessageSquare, UploadCloud, UserCheck, RefreshCw, Download } from 'lucide-react';

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

  const handleExportCSV = () => {
    if (!analyticsData) return;
    
    // Create CSV content for Top Missing Books
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Metric,Value\n";
    csvContent += `Stat,Total Books,${analyticsData.total_books}\n`;
    csvContent += `Stat,Total Users,${analyticsData.total_users}\n`;
    csvContent += `Stat,Total AI Chats,${analyticsData.total_chats}\n`;
    csvContent += "\n--- TOP MISSING BOOKS ---\n";
    csvContent += "Rank,Book Name,Search Count\n";
    
    analyticsData.top_missing_books.forEach((b, index) => {
      // Escape commas in book names
      const safeName = b.book_name.replace(/,/g, '');
      csvContent += `${index + 1},${safeName},${b.count}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `library_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">System Analytics</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={loading || !analyticsData}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-2xl border border-gray-800 p-6 h-96">
          <h3 className="text-lg font-medium text-white mb-6">Voice Queries Over Time (Last 7 Days)</h3>
          {loading ? (
             <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={analytics?.trend_data || []}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                 <XAxis dataKey="date" stroke="#9ca3af" />
                 <YAxis stroke="#9ca3af" />
                 <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                 <Line type="monotone" dataKey="queries" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
               </LineChart>
             </ResponsiveContainer>
          )}
        </div>
        
        <div className="glass-card rounded-2xl border border-gray-800 p-6 h-96 overflow-y-auto">
          <h3 className="text-lg font-medium text-white mb-4">Top Missing Books (Unfound)</h3>
          <p className="text-sm text-gray-400 mb-4">Books students searched for but the AI could not find in the catalog.</p>
          
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-800/50 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {analytics?.top_missing_books?.length > 0 ? (
                analytics.top_missing_books.map((book, index) => (
                  <li key={index} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700/50 hover:bg-gray-800/80 transition-colors">
                    <span className="font-medium text-gray-200 truncate pr-4">{book.title}</span>
                    <span className="bg-red-500/20 text-red-400 py-1 px-2.5 rounded-full text-xs font-bold whitespace-nowrap">
                      {book.searches} requests
                    </span>
                  </li>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">No missing books logged yet!</div>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
