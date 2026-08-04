import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', queries: 400 },
  { name: 'Feb', queries: 300 },
  { name: 'Mar', queries: 550 },
  { name: 'Apr', queries: 450 },
  { name: 'May', queries: 700 },
  { name: 'Jun', queries: 650 },
];

const Analytics = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white">System Analytics</h1>
      
      <div className="glass-card rounded-2xl border border-gray-800 p-6 h-96">
        <h3 className="text-lg font-medium text-white mb-6">Voice Queries Over Time</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
            <Line type="monotone" dataKey="queries" stroke="#3b82f6" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
