import React from 'react';
import { GameLog, InteractionMode, PlayerId, PlayerInfo } from '../types/game';
import { FACTION_PALETTES } from '../utils/pixelRenderer';
import { Plus, Swords, RotateCcw, ZoomIn, ZoomOut, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ActionToolbarProps {
  selectedTile: { x: number; y: number } | null;
  selectedOwner: PlayerId;
  selectedTanks: number;
  selectedIsCity: boolean;
  selectedTerrain: number;
  selectedDeathState: number;
  selectedIsExhausted?: boolean;
  humanPlayer: PlayerInfo;
  isAiTurn: boolean;
  canDeploy: boolean;
  canAttack: boolean;
  canRecall: boolean;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  onDeployTank: () => void;
  onRecallTank: () => void;
  onPickupAllTanks?: () => void;
  deployedTanksCount?: number;
  onInitiateAttack: () => void;
  onEndTurn: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  recentLogs: GameLog[];
  hoverOdds?: { x: number; y: number; chanceText: string; chanceNum: number } | null;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  selectedTile,
  selectedOwner,
  selectedTanks,
  selectedIsCity,
  selectedTerrain,
  selectedDeathState,
  selectedIsExhausted,
  humanPlayer,
  isAiTurn,
  canDeploy,
  canAttack,
  canRecall,
  interactionMode,
  setInteractionMode,
  onDeployTank,
  onRecallTank,
  onPickupAllTanks,
  deployedTanksCount = 0,
  onInitiateAttack,
  onEndTurn,
  zoom,
  onZoomIn,
  onZoomOut,
  recentLogs,
  hoverOdds,
}) => {
  const terrainNames = ['Grassland', 'Forest (Canopy)', 'Water / Pond'];
  const ownerPal = FACTION_PALETTES[selectedOwner];

  return (
    <footer className="w-full bg-[#111827] border-t-2 border-[#1f293d] p-2.5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 select-none shrink-0 z-30 font-mono">
      {/* Tile Intelligence Card */}
      <div className="flex items-center gap-3 bg-[#0b0f19] px-3 py-1.5 border border-slate-800 text-xs w-full md:w-auto">
        {hoverOdds ? (
          <div className="flex items-center gap-2 py-0.5 animate-pulse">
            <Swords className="w-4 h-4 text-red-400" />
            <span className="text-[10px] text-slate-400 uppercase">Target ({hoverOdds.x}, {hoverOdds.y}) Odds:</span>
            <span className={`font-bold text-sm tabular-nums ${hoverOdds.chanceNum >= 75 ? 'text-emerald-400' : hoverOdds.chanceNum >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {hoverOdds.chanceText}
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">(Click to assault)</span>
          </div>
        ) : selectedTile ? (
          <>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Sector</span>
              <span className="font-bold text-slate-200 tabular-nums">
                X:{selectedTile.x} Y:{selectedTile.y}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Control</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className="w-2.5 h-2.5 border border-black shrink-0"
                  style={{ backgroundColor: ownerPal.primary }}
                />
                <span className="font-semibold text-slate-200">{ownerPal.name}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Terrain / Site</span>
              <span className="text-slate-300">
                {selectedIsCity ? '★ City (No Tanks Allowed)' : terrainNames[selectedTerrain]}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Garrison</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-sky-400 tabular-nums">
                  {selectedTanks > 0 ? `${selectedTanks} Tank${selectedTanks > 1 ? 's' : ''}` : 'None'}
                </span>
                {selectedIsExhausted && (
                  <span className="text-[10px] px-1 bg-slate-800 text-slate-400 border border-slate-700">Resting</span>
                )}
              </div>
            </div>

            {/* Supply Line Status */}
            {selectedOwner !== 0 && (
              <>
                <div className="h-6 w-px bg-slate-800" />
                <div className="flex items-center gap-1">
                  {selectedDeathState > 0 ? (
                    <div className="flex items-center gap-1 text-red-400 font-bold text-[11px] animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>CUT OFF!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Supplied</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <span className="text-slate-500 text-xs italic">
            Click owned square to place/pickup tank. Hover enemy sector to preview attack odds.
          </span>
        )}
      </div>

      {/* Center: Recent Tactical Event Feed */}
      <div className="hidden xl:flex items-center gap-2 bg-[#0b0f19] px-3 py-1.5 border border-slate-800 text-xs text-slate-400 max-w-md truncate">
        <span className="text-[10px] uppercase font-bold text-slate-500">Radio Dispatch:</span>
        <span className="truncate text-slate-300 text-[11px]">
          {recentLogs.length > 0 ? recentLogs[0].text : 'Standing by for field commands.'}
        </span>
      </div>

      {/* Command Actions */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {/* Zoom Controls */}
        <div className="flex items-center bg-[#1e293b] border border-slate-700">
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 border-r border-slate-700 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-[10px] text-slate-400 font-bold tabular-nums">
            {zoom}px
          </span>
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 border-l border-slate-700 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Auto Pick Up All Tanks Button (To the left of Deploy and End Day boxes) */}
        {onPickupAllTanks && (
          <button
            onClick={onPickupAllTanks}
            disabled={isAiTurn || deployedTanksCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all ${
              !isAiTurn && deployedTanksCount > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-300 active:scale-95 shadow-md shadow-amber-950/40'
                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
            }`}
            title="Auto pickup all active tanks from across the continent into your reserve inventory"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-200" />
            <span>Auto Pickup All ({deployedTanksCount})</span>
          </button>
        )}

        {/* Deploy Tank Button */}
        <button
          onClick={onDeployTank}
          disabled={!canDeploy || isAiTurn}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all ${
            canDeploy && !isAiTurn
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 active:scale-95 shadow-md shadow-blue-900/40'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
          title={
            selectedIsCity
              ? 'Tanks cannot be stationed inside cities'
              : !canDeploy
              ? 'Must select owned non-city land and have tanks in reserve'
              : `Deploy 1 tank to selected sector (Reserves: ${humanPlayer.tanksInReserve})`
          }
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Deploy ({humanPlayer.tanksInReserve})</span>
        </button>

        {/* Recall / Pickup Tank to Inventory */}
        {canRecall && !isAiTurn && (
          <button
            onClick={onRecallTank}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 active:scale-95 transition-all"
            title="Return 1 stationed tank on this tile back into reserve inventory (or Right-Click tile)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Pickup (R-Click)</span>
          </button>
        )}

        {/* Attack Target Button */}
        {canAttack && !isAiTurn && (
          <button
            onClick={onInitiateAttack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white border-2 border-red-400 active:scale-95 shadow-lg shadow-red-900/50 transition-all animate-pulse"
          >
            <Swords className="w-4 h-4" />
            <span>Attack Sector</span>
          </button>
        )}

        {/* End Turn Button */}
        <button
          onClick={onEndTurn}
          disabled={isAiTurn}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-all ${
            !isAiTurn
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 active:scale-95 shadow-md shadow-emerald-950/40'
              : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{isAiTurn ? 'AI Moving...' : 'End Day'}</span>
        </button>
      </div>
    </footer>
  );
};
