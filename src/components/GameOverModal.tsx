import React from 'react';
import { Trophy, Skull, RotateCcw } from 'lucide-react';

interface GameOverModalProps {
  isVictory: boolean;
  turnDay: number;
  citiesCount: number;
  totalCities?: number;
  territoryCount: number;
  onRestart: () => void;
  onOpenNewGame?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  turnDay,
  citiesCount,
  totalCities = 50,
  territoryCount,
  onRestart,
  onOpenNewGame,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-md bg-[#111827] border-4 border-slate-600 shadow-2xl overflow-hidden text-center">
        {/* Banner */}
        <div
          className={`p-6 border-b-2 ${
            isVictory
              ? 'bg-amber-950/80 border-amber-500 text-amber-300'
              : 'bg-red-950/80 border-red-500 text-red-300'
          }`}
        >
          <div className="flex justify-center mb-3">
            {isVictory ? (
              <Trophy className="w-16 h-16 text-amber-400 animate-bounce" />
            ) : (
              <Skull className="w-16 h-16 text-red-400 animate-pulse" />
            )}
          </div>
          <h2
            className="text-lg font-extrabold uppercase tracking-widest mb-1"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '14px' }}
          >
            {isVictory ? 'VICTORY ACHIEVED!' : 'HEADQUARTERS FALLEN'}
          </h2>
          <p className="text-xs text-slate-300">
            {isVictory
              ? 'All rival factions have been eradicated. The continent is united under the Blue Guard!'
              : 'All your sovereign cities have been lost. Your military presence has been eliminated.'}
          </p>
        </div>

        {/* Campaign Debriefing Stats */}
        <div className="p-6 bg-[#0f172a] space-y-3 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-slate-400">
            <span>Campaign Duration:</span>
            <span className="font-bold text-slate-100 tabular-nums">Day {turnDay}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-slate-400">
            <span>Cities Under Command:</span>
            <span className="font-bold text-emerald-400 tabular-nums">{citiesCount} / {totalCities}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-800 text-slate-400">
            <span>Territorial Holdings:</span>
            <span className="font-bold text-sky-400 tabular-nums">{territoryCount} Sectors</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-[#111827] border-t border-slate-800 flex justify-center gap-3">
          {onOpenNewGame && (
            <button
              onClick={onOpenNewGame}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-all"
            >
              Custom Game
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 active:scale-95 transition-all shadow-lg shadow-blue-950/50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
