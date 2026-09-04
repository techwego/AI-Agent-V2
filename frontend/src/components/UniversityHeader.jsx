import React from 'react';
import { GraduationCap } from 'lucide-react';

const UniversityHeader = ({ isRouting = false }) => {
  return (
    <div className="flex items-center gap-3 px-2 py-1 select-none">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-600/20 text-white ring-2 ring-white flex-shrink-0">
        <GraduationCap size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight truncate">Anna University</h2>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${
            isRouting 
              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {isRouting ? 'Routing' : 'Online'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium tracking-wide truncate font-mono">
          Central Library · Interactive 3D Wayfinder
        </p>
      </div>
    </div>
  );
};

export default UniversityHeader;
