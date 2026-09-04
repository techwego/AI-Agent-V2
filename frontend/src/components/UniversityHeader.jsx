import React from 'react';
import { GraduationCap } from 'lucide-react';

const UniversityHeader = ({ isRouting = false }) => {
  return (
    <div className="flex items-center gap-3 px-2 py-1 select-none">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20 flex-shrink-0">
        <GraduationCap size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-white tracking-tight truncate">Anna University</h2>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${
            isRouting 
              ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40' 
              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
          }`}>
            {isRouting ? 'Routing' : 'Online'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-medium tracking-wide truncate font-mono">
          Central Library · Interactive 3D Wayfinder
        </p>
      </div>
    </div>
  );
};

export default UniversityHeader;
