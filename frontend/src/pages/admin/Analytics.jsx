import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAnalytics } from '../../api/client';
import { BookOpen, Users, Building2, MessageSquare, UploadCloud, UserCheck, RefreshCw, Download, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass, isLoading }) => (
  <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center space-x-4 shadow-sm">
    <div className={`p-3.5 rounded-2xl ${colorClass.bg} ${colorClass.text}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      {isLoading ? (
        <div className="h-7 w-20 bg-slate-100 rounded animate-pulse mt-1" />
      ) : (
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
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
    { title: 'Total Books', value: analytics?.total_books || 0, icon: BookOpen, colorClass: { bg: 'bg-blue-50', text: 'text-blue-600' } },
    { title: 'Total Users', value: analytics?.total_users || 0, icon: Users, colorClass: { bg: 'bg-indigo-50', text: 'text-indigo-600' } },
    { title: 'Departments', value: analytics?.total_departments || 0, icon: Building2, colorClass: { bg: 'bg-emerald-50', text: 'text-emerald-600' } },
    { title: "Today's Queries", value: analytics?.today_queries || 0, icon: MessageSquare, colorClass: { bg: 'bg-amber-50', text: 'text-amber-600' } },
  ];

  const stats2 = [
    { title: 'Vector Datasets Ingested', value: analytics?.total_uploads || 0, icon: UploadCloud, colorClass: { bg: 'bg-purple-50', text: 'text-purple-600' } },
    { title: 'Active Monthly Researchers', value: analytics?.active_users || 0, icon: UserCheck, colorClass: { bg: 'bg-sky-50', text: 'text-sky-600' } },
  ];

  const handleExportCSV = () => {
    if (!analytics) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Metric,Value\n";
    csvContent += `Stat,Total Books,${analytics.total_books}\n`;
    csvContent += `Stat,Total Users,${analytics.total_users}\n`;
    csvContent += `Stat,Total AI Chats,${analytics.total_chats}\n`;
    csvContent += "\n--- TOP MISSING BOOKS ---\n";
    csvContent += "Rank,Book Name,Search Count\n";
    
    if (analytics.top_missing_books) {
      analytics.top_missing_books.forEach((b, index) => {
        const safeName = String(b.title || b.book_name || '').replace(/,/g, '');
        const count = b.searches !== undefined ? b.searches : (b.count || 0);
        csvContent += `${index + 1},${safeName},${count}\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `library_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-blue-600" /> Usage & Search Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">Real-time telemetry on voice interactions, catalog queries, and missing book requests.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={handleExportCSV}
            disabled={loading || !analytics}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 shadow-sm transition-all"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats1.map((stat, i) => (
          <StatCard key={i} {...stat} isLoading={loading} />
        ))}
      </div>

      {/* Secondary 2 Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {stats2.map((stat, i) => (
          <StatCard key={i} {...stat} isLoading={loading} />
        ))}
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-blue-600" />
                <span>Voice & Chat Queries (Last 7 Days)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Interaction volume timeline across the campus network</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.trend_data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="queries" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Top Missing Books Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1">
              <AlertTriangle size={14} className="text-amber-500" />
              <span>Missing Book Demands</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">Books searched by students that are not currently in the catalog.</p>
            
            {loading ? (
              <div className="space-y-2.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {analytics?.top_missing_books?.length > 0 ? (
                  analytics.top_missing_books.map((book, index) => (
                    <li key={index} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                      <span className="font-semibold text-xs text-slate-800 truncate pr-3">{book.title}</span>
                      <span className="bg-red-50 text-red-700 border border-red-200 py-0.5 px-2 rounded-full text-[10px] font-bold whitespace-nowrap">
                        {book.searches} requests
                      </span>
                    </li>
                  ))
                ) : (
                  <div className="text-center text-slate-400 text-xs py-8">No unfound search queries recorded.</div>
                )}
              </ul>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Use this data to acquire frequently demanded library resources.
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
