import React from 'react';
import { GraduationCap } from 'lucide-react';

const UniversityHeader = ({ isRouting = false }) => {
  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center shadow-md shadow-blue-200/50 flex-shrink-0">
        <GraduationCap size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800 tracking-tight truncate">Anna University</h2>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase ${
            isRouting 
              ? 'bg-amber-50 text-amber-600 border border-amber-200' 
              : 'bg-green-50 text-green-600 border border-green-200'
          }`}>
            {isRouting ? 'Routing' : 'Online'}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 font-medium tracking-wide">
          Central Library · Interactive 3D Wayfinder
        </p>
      </div>
    </div>
  );
};

export default UniversityHeader;
