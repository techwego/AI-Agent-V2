import React from 'react';
import { Construction } from 'lucide-react';

const PlaceholderPage = ({ title }) => (
  <div className="h-full flex flex-col items-center justify-center text-center">
    <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
      <Construction size={40} className="text-blue-500" />
    </div>
    <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
    <p className="text-gray-400 max-w-md">This section is currently under development. Please check back later for updates.</p>
  </div>
);

export const Departments = () => <PlaceholderPage title="Departments Management" />;
export const Users = () => <PlaceholderPage title="User Management" />;
export const Analytics = () => <PlaceholderPage title="System Analytics" />;
export const Logs = () => <PlaceholderPage title="System Logs" />;
export const Settings = () => <PlaceholderPage title="System Settings" />;
