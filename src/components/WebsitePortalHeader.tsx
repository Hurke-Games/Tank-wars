import React from 'react';
import {
  Gamepad2,
  Maximize2,
  Minimize2,
  Map,
  BookOpen,
  Sliders
} from 'lucide-react';

interface WebsitePortalHeaderProps {
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  onOpenWorkshop: () => void;
  onOpenRules: () => void;
  onOpenNewGame: () => void;
}

export const WebsitePortalHeader: React.FC<WebsitePortalHeaderProps> = ({
  isTheaterMode,
  onToggleTheaterMode,
  onOpenWorkshop,
  onOpenRules,
  onOpenNewGame,
}) => {
  return (
    <header className="w-full bg-[#0a0f1d] border-b border-slate-800 text-slate-200 select-none z-40 font-mono text-xs">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 rounded-none flex items-center justify-center border border-white/60 shadow-md shadow-amber-950/60">
              <Gamepad2 className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="font-extrabold tracking-wider text-transparent bg-clip-text bg-linear-to-r from-amber-300 via-amber-400 to-amber-500 uppercase text-xs sm:text-sm"
                  style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
                >
                  HURKE GAMES
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[8px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  GBA TACTICS
                </span>
              </div>
              <p className="text-[9px] text-slate-400 hidden sm:block">
                Tank Wars: Advance Grid · 32-Bit Tactical Strategy
              </p>
            </div>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={onOpenNewGame}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Game</span>
          </button>

          <button
            onClick={onOpenWorkshop}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Map className="w-3.5 h-3.5 text-amber-400" />
            <span>Scenario Builder</span>
          </button>

          <button
            onClick={onOpenRules}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Field Manual</span>
          </button>
        </nav>

        {/* Action Controls & Fullscreen Theater Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheaterMode}
            title={isTheaterMode ? 'Return to Website View' : 'Switch to Fullscreen Arcade Theater'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#1e293b] hover:bg-slate-700 text-amber-300 border border-amber-500/50 active:scale-95 transition-all shadow-sm"
          >
            {isTheaterMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Website View</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
