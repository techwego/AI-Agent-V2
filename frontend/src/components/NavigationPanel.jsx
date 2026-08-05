import React from 'react';
import { MapPin, Navigation, Layers, Route, CheckCircle2 } from 'lucide-react';

const NavigationPanel = ({ routeInfo, directions, activeFloor, onFloorChange }) => {
  const floors = [
    { id: 'both', label: 'Both' },
    { id: '1', label: 'Floor 1' },
    { id: '2', label: 'Floor 2' },
  ];

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Floor Selector */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Floor</div>
        <div className="flex gap-1.5">
          {floors.map(f => (
            <button
              key={f.id}
              onClick={() => onFloorChange(f.id)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                activeFloor === f.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-900/20'
                  : 'bg-white/5 text-gray-500 border border-white/5 hover:text-gray-300 hover:border-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Route Info */}
      {routeInfo && (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Route</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <MapPin size={10} className="text-red-400" />
                <span className="text-[9px] text-gray-500 font-semibold uppercase">Destination</span>
              </div>
              <span className="text-sm font-bold text-white">Rack {routeInfo.destination}</span>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Layers size={10} className="text-blue-400" />
                <span className="text-[9px] text-gray-500 font-semibold uppercase">Floor</span>
              </div>
              <span className="text-sm font-bold text-white">Floor {routeInfo.floor}</span>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Route size={10} className="text-amber-400" />
                <span className="text-[9px] text-gray-500 font-semibold uppercase">Distance</span>
              </div>
              <span className="text-sm font-bold text-white">~{routeInfo.distance}m</span>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Navigation size={10} className="text-green-400" />
                <span className="text-[9px] text-gray-500 font-semibold uppercase">Steps</span>
              </div>
              <span className="text-sm font-bold text-white">{routeInfo.steps} steps</span>
            </div>
          </div>
        </div>
      )}

      {/* Turn-by-turn Directions */}
      {directions && directions.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Directions</div>
          <ol className="space-y-1.5">
            {directions.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5 ${
                  idx === directions.length - 1 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-white/5 text-gray-500 border border-white/10'
                }`}>
                  {idx === directions.length - 1 ? <CheckCircle2 size={10} /> : idx + 1}
                </span>
                <span className="text-xs text-gray-400 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Legend */}
      {!routeInfo && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Legend</div>
          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[#a9743f]"></span>Floor 1 racks (A / B)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[#3f8f94]"></span>Floor 2 racks (C / D)</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[#f2a93b]"></span>Route path</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[#5fe3a0]"></span>Your location</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[#e2665f]"></span>Destination</div>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">Drag to orbit · Scroll to zoom · Click a rack to route</p>
        </div>
      )}
    </div>
  );
};

export default NavigationPanel;
