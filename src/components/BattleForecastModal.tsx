import React from 'react';
import { CombatOdds, PlayerId, PlayerInfo } from '../types/game';
import { FACTION_PALETTES } from '../utils/pixelRenderer';
import { Swords, X, Shield, Crosshair, Sparkles } from 'lucide-react';

interface BattleForecastModalProps {
  odds: CombatOdds;
  attacker: PlayerInfo;
  defender: PlayerInfo;
  onConfirmAttack: () => void;
  onCancel: () => void;
}

export const BattleForecastModal: React.FC<BattleForecastModalProps> = ({
  odds,
  attacker,
  defender,
  onConfirmAttack,
  onCancel,
}) => {
  const attackerPal = FACTION_PALETTES[attacker.id];
  const defenderPal = FACTION_PALETTES[defender.id];

  // Visual color for win odds
  let oddsColor = 'text-emerald-400';
  if (odds.finalChance < 50) {
    oddsColor = 'text-red-400';
  } else if (odds.finalChance < 75) {
    oddsColor = 'text-amber-400';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none font-mono">
      <div className="w-full max-w-md bg-[#111827] border-2 border-slate-600 shadow-2xl overflow-hidden">
        {/* Advance Wars Header Banner */}
        <div className="bg-[#1e293b] border-b-2 border-slate-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px' }}>
              Combat Forecast
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Faction VS Standoff Header */}
        <div className="p-4 bg-[#0b0f19] border-b border-slate-800 flex items-center justify-between">
          {/* Attacker */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-slate-400">Assault Force</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className="w-3 h-3 border border-black"
                style={{ backgroundColor: attackerPal.primary }}
              />
              <span className="font-bold text-sm text-slate-100">{attacker.name}</span>
            </div>
            <span className="text-[11px] text-sky-400 mt-0.5">Armored Division</span>
          </div>

          <div className="px-3 py-1 bg-[#1e293b] border border-slate-700 text-amber-400 font-bold text-xs">
            VS
          </div>

          {/* Defender */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-slate-400">Target Garrison</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-sm text-slate-100">{defender.name}</span>
              <div
                className="w-3 h-3 border border-black"
                style={{ backgroundColor: defenderPal.primary }}
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5">
              {odds.isCity ? 'Fortified City' : odds.hasTank ? 'Armored Tank' : 'Open Ground'}
            </span>
          </div>
        </div>

        {/* Tactical Math Breakdown */}
        <div className="p-4 space-y-3 bg-[#111827]">
          {/* Large Probability Display */}
          <div className="p-3 bg-[#0f172a] border border-slate-800 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
              Estimated Victory Probability
            </span>
            <div className={`text-4xl font-extrabold tabular-nums tracking-tight ${oddsColor}`}>
              {odds.finalPercentageText}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              {odds.finalChance >= 75
                ? 'High tactical advantage'
                : odds.finalChance >= 50
                ? 'Contested engagement'
                : 'Heavy defensive fortifications'}
            </span>
          </div>

          {/* Formula Line-by-Line Breakdown */}
          <div className="bg-[#182234] border border-slate-800 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-700/60 text-[11px] font-semibold text-slate-300">
              <span>Tactical Parameter</span>
              <span>Value</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                <span>Base Target Odds ({odds.isCity ? 'City' : odds.hasTank ? 'Direct Tank' : 'Empty Land'})</span>
              </span>
              <span className="font-bold tabular-nums text-slate-100">{odds.baseChance}%</span>
            </div>

            {odds.adjacentDefendingTanks > 0 && (
              <div className="flex items-center justify-between text-red-300">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <span>Adjacent Defending Tanks ({odds.adjacentDefendingTanks})</span>
                </span>
                <span className="font-bold tabular-nums text-red-400">-{odds.tankPenaltyPercent}%</span>
              </div>
            )}

            {odds.hasAdjacentCity && (
              <div className="flex items-center justify-between text-red-300">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <span>Adjacent Defending City Support</span>
                </span>
                <span className="font-bold tabular-nums text-red-400">-{odds.cityPenaltyPercent}%</span>
              </div>
            )}

            {odds.consecutiveFailures > 0 && (
              <div className="flex items-center justify-between text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prior Failed Assaults ({odds.consecutiveFailures}× retry bonus)</span>
                </span>
                <span className="font-bold tabular-nums text-emerald-400">×{odds.multiplier.toFixed(3)}</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 space-y-0.5 px-1">
            <p>• If assault fails, consecutive retry multiplier increases by ×1.05.</p>
            <p>• If victorious, defending unit is eliminated and territory is captured.</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-3 bg-[#0f172a] border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold bg-[#1e293b] hover:bg-slate-700 text-slate-300 border border-slate-600 active:scale-95 transition-all"
          >
            Cancel Order
          </button>
          <button
            onClick={onConfirmAttack}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white border-2 border-red-400 active:scale-95 shadow-lg shadow-red-950/40 transition-all"
          >
            <Swords className="w-4 h-4" />
            <span>Engage Assault</span>
          </button>
        </div>
      </div>
    </div>
  );
};
