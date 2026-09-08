import React, { useState, useEffect } from 'react';
import { GraduationCap } from 'lucide-react';
import { getArchitecture } from '../api/client';

const UniversityHeader = ({ isRouting = false }) => {
  const [collegeName, setCollegeName] = useState(() => localStorage.getItem('cached_college_name') || 'Anna University');
  const [libraryName, setLibraryName] = useState(() => localStorage.getItem('cached_library_name') || 'Central Library');

  const syncSettings = () => {
    getArchitecture().then(res => {
      if (res?.data) {
        if (res.data.college_name) {
          setCollegeName(res.data.college_name);
          localStorage.setItem('cached_college_name', res.data.college_name);
        }
        if (res.data.library_name) {
          setLibraryName(res.data.library_name);
          localStorage.setItem('cached_library_name', res.data.library_name);
        }
      }
    }).catch(() => {});
  };

  useEffect(() => {
    syncSettings();
    window.addEventListener('system-settings-change', syncSettings);
    return () => window.removeEventListener('system-settings-change', syncSettings);
  }, []);

  return (
    <div className="flex items-center gap-3 px-2 py-1 select-none">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-600/20 text-white ring-2 ring-white flex-shrink-0">
        <GraduationCap size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight truncate">{collegeName}</h2>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${
            isRouting 
              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {isRouting ? 'Routing' : 'Online'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium tracking-wide truncate font-mono">
          {libraryName} · Interactive 3D Wayfinder
        </p>
      </div>
    </div>
  );
};

export default UniversityHeader;
