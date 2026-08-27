import React, { useState, useEffect } from 'react';
import { getLogs, getChatLogs } from '../../api/client';
import { RefreshCw, Search, Terminal, MessageSquare } from 'lucide-react';

const Logs = () => {
  const [activeTab, setActiveTab] = useState('system'); // 'system' or 'chat'
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
    if (!action) return 'text-gray-400';
    if (action.startsWith('CREATE_')) return 'text-green-500';
    if (action.startsWith('DELETE_')) return 'text-red-500';
    if (action.startsWith('UPDATE_')) return 'text-amber-500';
    if (action.startsWith('BLOCK_')) return 'text-red-500';
    if (action.startsWith('UPLOAD_')) return 'text-blue-500';
    if (action === 'LOGIN') return 'text-cyan-500';
    return 'text-gray-400';
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
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">System Logs</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'system' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white'}`}
        >
          <Terminal size={16} /> Admin Activity
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'chat' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white'}`}
        >
          <MessageSquare size={16} /> AI Chat Audit
        </button>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>Showing {activeTab === 'system' ? filteredSystemLogs.length : filteredChatLogs.length} entries</span>
      </div>

      <div className="glass-card rounded-2xl border border-gray-800 p-4 flex-1 overflow-auto bg-gray-950 font-mono text-sm">
        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-5 bg-gray-900 rounded animate-pulse w-3/4"></div>
            ))}
          </div>
        ) : activeTab === 'system' ? (
          filteredSystemLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-10">No system logs found.</div>
          ) : (
            <div className="space-y-1">
              {filteredSystemLogs.map((log) => (
                <div key={log.id} className="flex gap-2 hover:bg-gray-900/50 p-1 rounded transition-colors break-words">
                  <span className="text-gray-500 shrink-0">{formatDate(log.created_at)}</span>
                  <span className={`font-semibold shrink-0 ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-gray-300 break-all sm:break-normal">
                    {log.details}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredChatLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-10">No AI chat logs found.</div>
          ) : (
            <div className="space-y-4">
              {filteredChatLogs.map((log) => (
                <div key={log.id} className="border border-gray-800 rounded-lg p-3 bg-gray-900/40">
                  <div className="text-gray-500 text-xs mb-2">{formatDate(log.created_at)}</div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-blue-400 font-semibold shrink-0">User:</span>
                    <span className="text-gray-200">{log.query}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-semibold shrink-0">AI:</span>
                    <span className="text-gray-400 whitespace-pre-wrap">{log.response}</span>
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
