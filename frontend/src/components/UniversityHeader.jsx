import React from 'react';
import { Building2, GraduationCap } from 'lucide-react';

const UniversityHeader = ({ isRouting = false }) => {
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-700 to-blue-700 flex items-center justify-center shadow-lg shadow-purple-900/30 flex-shrink-0">
        <GraduationCap size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-tight truncate">Anna University</h2>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase ${
            isRouting 
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' 
              : 'bg-green-500/15 text-green-400 border border-green-500/25'
          }`}>
            {isRouting ? 'Routing' : 'Online'}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 font-medium tracking-wide">
          Central Library · Interactive 3D Wayfinder
        </p>
      </div>
    </div>
  );
};

export default UniversityHeader;
