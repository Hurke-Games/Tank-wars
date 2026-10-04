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
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenWorkshop: () => void;
  onOpenRules: () => void;
  onOpenNewGame: () => void;
}

export const WebsitePortalHeader: React.FC<WebsitePortalHeaderProps> = ({
  isFullscreen,
  onToggleFullscreen,
  onOpenWorkshop,
  onOpenRules,
  onOpenNewGame,
}) => {
  return (
    <header className="w-full bg-[#090d16] border-b border-slate-800/80 text-slate-200 select-none z-40 font-mono text-xs flex-none">
      <div className="w-full px-3 sm:px-4 py-2 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 flex items-center justify-center border border-amber-300/40 shadow-sm shadow-amber-950/50">
              <Gamepad2 className="w-4 h-4 text-black" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="font-extrabold tracking-wider text-transparent bg-clip-text bg-linear-to-r from-amber-300 via-amber-400 to-amber-500 uppercase text-xs"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
              >
                HURKE GAMES
              </span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <span className="text-slate-300 text-xs font-semibold tracking-wide hidden sm:inline">
                Tank Wars: Advance Grid
              </span>
            </div>
          </div>
        </div>

        {/* Minimalist Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenNewGame}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-colors flex items-center gap-1.5 text-xs active:scale-95"
            title="Start a new tactical campaign"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">New Game</span>
          </button>

          <button
            onClick={onOpenWorkshop}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-colors flex items-center gap-1.5 text-xs active:scale-95"
            title="Open Scenario Builder & Workshop"
          >
            <Map className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Scenario Workshop</span>
          </button>

          <button
            onClick={onOpenRules}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-colors flex items-center gap-1.5 text-xs active:scale-95"
            title="View Rules & Field Manual"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Field Manual</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#131b2e] hover:bg-slate-700 text-amber-300 border border-amber-500/40 active:scale-95 transition-all shadow-xs"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
