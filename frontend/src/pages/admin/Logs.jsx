import React, { useState, useEffect } from 'react';
import { getLogs, getChatLogs } from '../../api/client';
import { RefreshCw, Search, Terminal, MessageSquare, ScrollText } from 'lucide-react';

const Logs = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [logs, setLogs] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      if (activeTab === 'system') {
        const res = await getLogs();
        setLogs(res.data || []);
      } else {
        const res = await getChatLogs();
        setChatLogs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  const getActionColor = (action) => {
    if (!action) return 'text-slate-600';
    if (action.startsWith('CREATE_')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (action.startsWith('DELETE_')) return 'text-red-700 bg-red-50 border-red-200';
    if (action.startsWith('UPDATE_')) return 'text-amber-700 bg-amber-50 border-amber-200';
    if (action.startsWith('BLOCK_')) return 'text-red-700 bg-red-50 border-red-200';
    if (action.startsWith('UPLOAD_')) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (action === 'LOGIN') return 'text-purple-700 bg-purple-50 border-purple-200';
    return 'text-slate-700 bg-slate-100 border-slate-200';
  };

  const filteredSystemLogs = logs.filter(log => {
    const searchLower = search.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(searchLower)) ||
      (log.details && log.details.toLowerCase().includes(searchLower))
    );
  });

  const filteredChatLogs = chatLogs.filter(log => {
    const searchLower = search.toLowerCase();
    return (
      (log.query && log.query.toLowerCase().includes(searchLower)) ||
      (log.response && log.response.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return `[${dateString}]`;
    const pad = (n) => n.toString().padStart(2, '0');
    return `[${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}]`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ScrollText className="text-blue-600" /> Audit & System Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">Immutable security trail for administrative actions and student AI interactions.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
            />
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === 'system' 
              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Terminal size={14} /> Admin Activity Logs
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === 'chat' 
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MessageSquare size={14} /> AI Query Audit
        </button>
      </div>

      {/* Log Terminal Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 flex-1 overflow-auto font-mono text-xs shadow-sm">
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
            ))}
          </div>
        ) : activeTab === 'system' ? (
          filteredSystemLogs.length === 0 ? (
            <div className="text-slate-400 text-center py-12 font-sans text-xs">No admin logs recorded.</div>
          ) : (
            <div className="space-y-2">
              {filteredSystemLogs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <span className="text-slate-400 font-semibold">{formatDate(log.created_at)}</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-slate-800 font-medium">
                    {log.details}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredChatLogs.length === 0 ? (
            <div className="text-slate-400 text-center py-12 font-sans text-xs">No AI chat queries recorded.</div>
          ) : (
            <div className="space-y-3 font-sans">
              {filteredChatLogs.map((log) => (
                <div key={log.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2">
                  <div className="text-slate-400 text-[10px] font-mono">{formatDate(log.created_at)}</div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-blue-700 font-bold shrink-0">User Query:</span>
                    <span className="text-slate-800 font-medium">{log.query}</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-indigo-700 font-bold shrink-0">AI Response:</span>
                    <span className="text-slate-600 leading-relaxed">{log.response}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

    </div>
  );
};

export default Logs;
