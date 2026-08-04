import React from 'react';

const Departments = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Departments Management</h1>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
          Add Department
        </button>
      </div>
      <div className="glass-card rounded-2xl border border-gray-800 p-6 flex-1 text-gray-400 flex items-center justify-center">
        Department list will be displayed here.
      </div>
    </div>
  );
};

export default Departments;
