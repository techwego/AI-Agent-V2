import React from 'react';

const Settings = () => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white">System Settings</h1>
      
      <div className="glass-card rounded-2xl border border-gray-800 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Vector Database</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Host URL</label>
              <input type="text" value="http://localhost:6333" readOnly className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Collection Name</label>
              <input type="text" value="library_books" readOnly className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" />
            </div>
          </div>
        </div>
        
        <div className="pt-6 border-t border-gray-800">
          <h3 className="text-lg font-medium text-white mb-4">LLM Configuration</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Model Name</label>
            <input type="text" value="llama-3-8b-instruct" readOnly className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
