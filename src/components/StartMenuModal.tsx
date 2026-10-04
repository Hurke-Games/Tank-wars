import React, { useState } from 'react';
import { AiPlaystyle, GameSettings } from '../types/game';
import { retroAudio } from '../audio/retroAudio';
import { Play, Eye, EyeOff, Shield, MapPin, Users, Sliders, X, Flame, ShieldAlert, Target, Map, Plus } from 'lucide-react';

interface StartMenuModalProps {
  currentSettings: GameSettings;
  onStartGame: (newSettings: GameSettings) => void;
  onOpenScenarioWorkshop?: () => void;
  onClose?: () => void;
  isIngameModal?: boolean;
}

export const StartMenuModal: React.FC<StartMenuModalProps> = ({
  currentSettings,
  onStartGame,
  onOpenScenarioWorkshop,
  onClose,
  isIngameModal = false,
}) => {
  const [gridSize, setGridSize] = useState<number>(currentSettings.gridSize);
  const [numAiPlayers, setNumAiPlayers] = useState<number>(currentSettings.numAiPlayers);
  const [totalCities, setTotalCities] = useState<number>(currentSettings.totalCities);
  const [fogOfWar, setFogOfWar] = useState<boolean>(currentSettings.fogOfWar);
  const [aiPlaystyles, setAiPlaystyles] = useState<Record<number, AiPlaystyle>>({
    2: currentSettings.aiPlaystyles?.[2] || 'berserk',
    3: currentSettings.aiPlaystyles?.[3] || 'balanced',
    4: currentSettings.aiPlaystyles?.[4] || 'defensive',
  });

  const handleLaunch = () => {
    retroAudio.playTurnStart();
    onStartGame({
      gridSize,
      numAiPlayers,
      totalCities,
      fogOfWar,
      aiPlaystyles,
    });
  };

  const mapSizePresets = [
    { label: '30 × 30', value: 30, desc: 'Fast Skirmish' },
    { label: '50 × 50', value: 50, desc: 'Classic Field' },
    { label: '75 × 75', value: 75, desc: 'Grand Campaign' },
    { label: '100 × 100', value: 100, desc: 'Massive Continent' },
  ];

  const aiFactions = [
    { count: 1, label: '1 Rival', name: 'Red Legion', color: '#DC2626' },
    { count: 2, label: '2 Rivals', name: 'Red + Green', color: '#16A34A' },
    { count: 3, label: '3 Rivals', name: 'Red + Green + Gold', color: '#D97706' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none font-mono">
      <div className="relative w-full max-w-xl bg-[#0F172A] border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Retro Header with "Tank Wars" Title */}
        <div className="relative bg-linear-to-r from-blue-900 via-slate-900 to-red-950 p-4 border-b-2 border-slate-700 text-center shrink-0">
          {isIngameModal && onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* GBA Tank Wars Title Wordmark */}
          <div className="inline-block relative">
            <div className="flex items-center justify-center gap-3">
              <div className="w-3.5 h-3.5 bg-blue-500 rotate-45 border border-white" />
              <h1
                className="text-2xl sm:text-3xl font-extrabold tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                TANK WARS
              </h1>
              <div className="w-3.5 h-3.5 bg-red-500 rotate-45 border border-white" />
            </div>
            <p className="text-[10px] text-sky-300 font-bold tracking-widest uppercase mt-1">
              32-Bit Tactical Grid War
            </p>
          </div>
        </div>

        {/* Configuration Options Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs text-slate-200">
          {/* Custom Scenario Builder & Workshop Gateway */}
          {onOpenScenarioWorkshop && (
            <div className="bg-linear-to-r from-amber-950/60 via-[#111827] to-slate-900 border-2 border-amber-500/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/30">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase text-xs">
                  <Map className="w-4 h-4 text-amber-400" />
                  <span>Scenario Workshop & Custom Builder</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Build custom maps, place impassable water barriers, cities, and armies. Import & export maps (up to 10 stored)!
                </p>
              </div>

              <button
                onClick={() => {
                  retroAudio.playClick();
                  onOpenScenarioWorkshop();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider border border-amber-300 active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Open Workshop</span>
              </button>
            </div>
          )}

          {/* Option 1: Map Dimension */}
          <div className="bg-[#111827] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold uppercase text-sky-400 text-[11px]">
                <MapPin className="w-4 h-4" />
                Map Dimension
              </span>
              <span className="font-bold text-amber-400 tabular-nums">
                {gridSize} × {gridSize} ({gridSize * gridSize} tiles)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {mapSizePresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setGridSize(preset.value);
                    retroAudio.playClick();
                  }}
                  className={`p-2 text-center border transition-all ${
                    gridSize === preset.value
                      ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-md shadow-blue-900/50'
                      : 'bg-[#1e293b] text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className="font-bold">{preset.label}</div>
                  <div className="text-[9px] text-slate-400 opacity-80">{preset.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] text-slate-400">Custom Size:</span>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="flex-1 accent-blue-500 cursor-pointer"
              />
              <span className="w-10 text-right tabular-nums text-sky-300 font-bold">{gridSize}</span>
            </div>
          </div>

          {/* Option 2: Computer Players (AI Rivals) */}
          <div className="bg-[#111827] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold uppercase text-emerald-400 text-[11px]">
                <Users className="w-4 h-4" />
                Computer Opponents
              </span>
              <span className="font-bold text-amber-400">
                1 Human vs {numAiPlayers} AI
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {aiFactions.map((f) => (
                <button
                  key={f.count}
                  onClick={() => {
                    setNumAiPlayers(f.count);
                    retroAudio.playClick();
                  }}
                  className={`p-2.5 text-center border transition-all ${
                    numAiPlayers === f.count
                      ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-md shadow-emerald-900/50'
                      : 'bg-[#1e293b] text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{f.label}</div>
                  <div className="text-[9px] text-slate-300/80 truncate mt-0.5">{f.name}</div>
                </button>
              ))}
            </div>

            {/* Individual AI Commander Playstyles */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Assign Rival Playstyles:
              </span>

              {[
                { id: 2, name: 'Red Legion', faction: 'Crimson Corp', color: '#DC2626' },
                ...(numAiPlayers >= 2 ? [{ id: 3, name: 'Green Fleet', faction: 'Emerald Div', color: '#16A34A' }] : []),
                ...(numAiPlayers >= 3 ? [{ id: 4, name: 'Gold Dominion', faction: 'Solar Strike', color: '#D97706' }] : []),
              ].map((rival) => {
                const currentStyle = aiPlaystyles[rival.id] || 'balanced';
                return (
                  <div key={rival.id} className="bg-[#0b0f19] p-2 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 border border-white/50" style={{ backgroundColor: rival.color }} />
                        <span className="font-bold text-slate-200 text-xs">{rival.name}</span>
                        <span className="text-[9px] text-slate-400">({rival.faction})</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-none" style={{ color: rival.color }}>
                        {currentStyle.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {(['berserk', 'balanced', 'defensive'] as AiPlaystyle[]).map((style) => (
                        <button
                          key={style}
                          onClick={() => {
                            setAiPlaystyles((prev) => ({ ...prev, [rival.id]: style }));
                            retroAudio.playClick();
                          }}
                          className={`py-1 px-1.5 text-center border text-[10px] uppercase font-bold transition-all ${
                            currentStyle === style
                              ? style === 'berserk'
                                ? 'bg-red-700 text-white border-red-400 shadow-sm'
                                : style === 'balanced'
                                ? 'bg-emerald-700 text-white border-emerald-400 shadow-sm'
                                : 'bg-amber-700 text-white border-amber-400 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>

                    <p className="text-[9px] text-slate-400 leading-tight">
                      {currentStyle === 'berserk' && 'Berserk: 100% attack deployment, aggressive exploration, hyper-focused on players.'}
                      {currentStyle === 'balanced' && 'Balanced: 30% reserve for city defense, 80% attacks focused on player threats.'}
                      {currentStyle === 'defensive' && 'Defensive: 60% fortress reserve around cities, 50% attacks on players / 50% expansion.'}
                    </p>
                  </div>
                );
              })}

              <p className="text-[9px] text-amber-300/80 italic">
                * All commanders activate Desperation Override when losing ground, committing 100% reserves to recover territory.
              </p>
            </div>
          </div>

          {/* Option 3: Number of Cities */}
          <div className="bg-[#111827] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold uppercase text-amber-400 text-[11px]">
                <Sliders className="w-4 h-4" />
                Continental Cities
              </span>
              <span className="font-bold text-amber-300 tabular-nums">
                {totalCities} Total ({1 + numAiPlayers} Capitals + {Math.max(0, totalCities - (1 + numAiPlayers))} Neutral)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {[20, 35, 50, 75].map((presetVal) => {
                const maxAllowed = Math.min(100, Math.floor((gridSize * gridSize) / 10));
                const disabled = presetVal > maxAllowed;
                return (
                  <button
                    key={presetVal}
                    disabled={disabled}
                    onClick={() => {
                      setTotalCities(presetVal);
                      retroAudio.playClick();
                    }}
                    className={`py-1.5 px-2 text-center border text-xs transition-all ${
                      totalCities === presetVal
                        ? 'bg-amber-600 text-white border-amber-300 font-bold shadow-md shadow-amber-900/50'
                        : disabled
                        ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                        : 'bg-[#1e293b] text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-bold">{presetVal} Cities</div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={Math.max(5, 1 + numAiPlayers + 1)}
                max={Math.min(100, Math.floor((gridSize * gridSize) / 10))}
                step={5}
                value={Math.min(totalCities, Math.min(100, Math.floor((gridSize * gridSize) / 10)))}
                onChange={(e) => setTotalCities(Number(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="w-16 text-right tabular-nums text-amber-300 font-bold">{totalCities} Cities</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Cities produce +2 tanks/day and secure supply lines against inverted death states.
            </p>
          </div>

          {/* Option 4: Fog of War */}
          <div className="bg-[#111827] border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold uppercase text-purple-400 text-[11px]">
                {fogOfWar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                Fog of War System
              </span>
              <span className={`font-bold ${fogOfWar ? 'text-amber-400' : 'text-sky-400'}`}>
                {fogOfWar ? 'FOG ACTIVE' : 'FOG DISABLED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setFogOfWar(true);
                  retroAudio.playClick();
                }}
                className={`p-2.5 text-center border transition-all ${
                  fogOfWar
                    ? 'bg-purple-700 text-white border-purple-400 font-bold shadow-md shadow-purple-900/50'
                    : 'bg-[#1e293b] text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <div className="font-bold">Fog of War ON</div>
                <div className="text-[9px] text-slate-300/70 mt-0.5">Tactical 1-tile perimeter vision</div>
              </button>

              <button
                onClick={() => {
                  setFogOfWar(false);
                  retroAudio.playClick();
                }}
                className={`p-2.5 text-center border transition-all ${
                  !fogOfWar
                    ? 'bg-sky-600 text-white border-sky-400 font-bold shadow-md shadow-sky-900/50'
                    : 'bg-[#1e293b] text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <div className="font-bold">Fog of War OFF</div>
                <div className="text-[9px] text-slate-300/70 mt-0.5">All sectors visible, AI targets all cities</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              When Fog is OFF, the entire map is revealed and computer commanders seek out distant cities directly.
            </p>
          </div>
        </div>

        {/* Start Button Footer */}
        <div className="p-4 bg-[#0b0f19] border-t-2 border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[10px] text-slate-400 hidden sm:block">
            Right-click: pan & pick up tanks · Left-click: deploy & attack
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenScenarioWorkshop && (
              <button
                onClick={() => {
                  retroAudio.playClick();
                  onOpenScenarioWorkshop();
                }}
                className="flex-1 sm:flex-none px-4 py-3 text-xs font-bold uppercase tracking-wider bg-[#1e293b] hover:bg-slate-700 text-amber-300 border border-amber-500/60 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Map className="w-3.5 h-3.5" />
                <span>Workshop</span>
              </button>
            )}

            <button
              onClick={handleLaunch}
              className="flex-1 sm:flex-none px-7 py-3 text-sm font-bold uppercase tracking-wider bg-linear-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white border-2 border-emerald-300 active:scale-95 shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-2"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '11px' }}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START MISSION</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
