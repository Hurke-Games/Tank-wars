import React from 'react';
import { PlayerId, PlayerInfo } from '../types/game';
import { FACTION_PALETTES } from '../utils/pixelRenderer';
import { Volume2, VolumeX, BookOpen, Compass, ShieldAlert, Sliders, Map } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';

interface GbaHeaderProps {
  turnDay: number;
  activePlayerId: PlayerId;
  players: PlayerInfo[];
  humanPlayer: PlayerInfo;
  isAiTurn: boolean;
  aiThinkingMessage?: string;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  onOpenRules: () => void;
  isolatedTileCount: number;
  onJumpToCapital: () => void;
  onOpenNewGame?: () => void;
  onOpenScenarioWorkshop?: () => void;
}

export const GbaHeader: React.FC<GbaHeaderProps> = ({
  turnDay,
  activePlayerId,
  players,
  humanPlayer,
  isAiTurn,
  aiThinkingMessage,
  isMuted,
  setIsMuted,
  onOpenRules,
  isolatedTileCount,
  onJumpToCapital,
  onOpenNewGame,
  onOpenScenarioWorkshop,
}) => {
  const activePlayer = players[activePlayerId] || humanPlayer;
  const activePal = FACTION_PALETTES[activePlayerId];

  return (
    <header className="w-full bg-[#111827] border-b-2 border-[#1f293d] px-3 py-2 flex items-center justify-between shadow-md select-none shrink-0 z-30 font-mono">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-none rotate-45 border border-white/50" />
          <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}>
            Tank Wars
          </h1>
        </div>

        {/* Isolated Territory Alert Indicator */}
        {isolatedTileCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-950/80 border border-red-500/80 text-red-300 text-xs animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span className="font-semibold">{isolatedTileCount} tiles cut off!</span>
          </div>
        )}
      </div>

      {/* Zone 2: Game telemetry & Turn Status */}
      <div className="flex items-center gap-4 text-xs">
        {/* Turn / Day */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e293b] border border-slate-700">
          <span className="text-slate-400 text-[10px] uppercase">DAY</span>
          <span className="font-bold text-amber-400 tabular-nums text-xs">{turnDay}</span>
        </div>

        {/* Turn Banner */}
        <div
          className="flex items-center gap-2 px-3 py-1 border transition-all"
          style={{
            borderColor: activePal.primary,
            backgroundColor: `${activePal.primary}22`,
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-none border border-black"
            style={{ backgroundColor: activePal.primary }}
          />
          <div className="flex items-center gap-1">
            <span className="text-slate-300 uppercase text-[10px]">Turn:</span>
            <span
              className="font-bold text-xs"
              style={{ color: activePal.highlight }}
            >
              {activePlayer.name}
            </span>
            {activePlayer.isAi && activePlayer.playstyle && (
              <span
                className={`text-[9px] font-bold uppercase px-1 py-0.2 border ${
                  activePlayer.isDesperate
                    ? 'bg-red-950 text-red-300 border-red-500 animate-pulse'
                    : 'bg-black/50 text-slate-300 border-slate-700'
                }`}
              >
                {activePlayer.playstyle}
                {activePlayer.isDesperate && ' !'}
              </span>
            )}
          </div>
          {isAiTurn && (
            <span className="text-[10px] text-amber-300 animate-pulse font-sans">
              ({aiThinkingMessage || 'Tactical processing...'})
            </span>
          )}
        </div>

        {/* Human Player Tactical Reserve Stats */}
        <div className="hidden lg:flex items-center gap-3 text-xs bg-[#0f172a] px-3 py-1 border border-slate-800">
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-400 text-[10px] uppercase">Tanks in Reserve:</span>
            <span className="font-bold text-sky-400 tabular-nums">{humanPlayer.tanksInReserve}</span>
          </div>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-400 text-[10px] uppercase">Cities Owned:</span>
            <span className="font-bold text-emerald-400 tabular-nums">{humanPlayer.citiesCount}</span>
            <span className="text-[10px] text-emerald-300/70">(+{humanPlayer.citiesCount * 2}/day)</span>
          </div>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-400 text-[10px] uppercase">Territory:</span>
            <span className="font-bold text-slate-100 tabular-nums">{humanPlayer.territoryCount} tiles</span>
          </div>
        </div>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2">
        {onOpenScenarioWorkshop && (
          <button
            onClick={onOpenScenarioWorkshop}
            title="Scenario Builder & Custom Map Workshop"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-700 hover:bg-amber-600 text-white border border-amber-400 active:scale-95 transition-all"
          >
            <Map className="w-3.5 h-3.5 text-amber-200" />
            <span className="hidden sm:inline">Workshop</span>
          </button>
        )}

        {onOpenNewGame && (
          <button
            onClick={onOpenNewGame}
            title="Start New Procedural Game"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400 active:scale-95 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Game</span>
          </button>
        )}

        <button
          onClick={onJumpToCapital}
          title="Jump camera to Capital City (HQ)"
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#1e293b] hover:bg-slate-700 text-slate-200 border border-slate-600 active:scale-95 transition-all"
        >
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">HQ</span>
        </button>

        <button
          onClick={() => {
            const next = !isMuted;
            setIsMuted(next);
            retroAudio.setMuted(next);
            if (!next) retroAudio.playClick();
          }}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="p-1.5 text-slate-300 hover:text-white bg-[#1e293b] hover:bg-slate-700 border border-slate-600 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          onClick={onOpenRules}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 active:scale-95 transition-all"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Manual</span>
        </button>
      </div>
    </header>
  );
};
