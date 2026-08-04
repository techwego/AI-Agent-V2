import React from 'react';

const Logs = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <h1 className="text-2xl font-bold text-white">System Logs</h1>
      <div className="glass-card rounded-2xl border border-gray-800 p-4 flex-1 overflow-auto bg-gray-950 font-mono text-sm text-gray-300">
        <div>[2024-01-25 10:23:41] INFO: System started successfully.</div>
        <div>[2024-01-25 10:25:12] INFO: Admin user logged in.</div>
        <div>[2024-01-25 10:42:05] WARN: High latency on vector DB connection.</div>
        <div>[2024-01-25 11:05:33] INFO: Dataset upload completed (342 books added).</div>
      </div>
    </div>
  );
};

export default Logs;
