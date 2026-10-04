import React, { useState, useRef } from 'react';
import { CustomScenario } from '../types/game';
import {
  getSavedScenarios,
  deleteScenario,
  exportScenarioToJson,
  validateAndParseScenario,
  saveScenario,
  MAX_CUSTOM_SCENARIOS,
} from '../utils/scenarioStorage';
import { retroAudio } from '../audio/retroAudio';
import {
  Play,
  Pencil,
  Trash2,
  Download,
  Upload,
  Plus,
  X,
  MapPin,
  Users,
  Eye,
  EyeOff,
  Building2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface ScenarioListModalProps {
  onPlayScenario: (scenario: CustomScenario) => void;
  onEditScenario: (scenario: CustomScenario) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export const ScenarioListModal: React.FC<ScenarioListModalProps> = ({
  onPlayScenario,
  onEditScenario,
  onCreateNew,
  onClose,
}) => {
  const [scenarios, setScenarios] = useState<CustomScenario[]>(() => getSavedScenarios());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshList = () => {
    setScenarios(getSavedScenarios());
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete scenario "${name}"? This cannot be undone.`)) {
      deleteScenario(id);
      retroAudio.playClick();
      refreshList();
    }
  };

  const handleExport = (scenario: CustomScenario) => {
    exportScenarioToJson(scenario);
    retroAudio.playClick();
  };

  const handleImportClick = () => {
    if (scenarios.length >= MAX_CUSTOM_SCENARIOS) {
      alert(`Storage limit reached (${MAX_CUSTOM_SCENARIOS} maximum). Please delete an existing scenario first.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = validateAndParseScenario(text);
        const saveResult = saveScenario(parsed);

        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Failed to save scenario.');
        }

        retroAudio.playTurnStart();
        setErrorMessage(null);
        refreshList();
      } catch (err) {
        retroAudio.playAttackFailed();
        setErrorMessage(err instanceof Error ? err.message : 'Failed to import scenario.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none font-mono">
      <div className="relative w-full max-w-4xl bg-[#0F172A] border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Hidden File Input for JSON Scenario Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.tankwar.json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-950 via-slate-900 to-amber-950 p-4 border-b-2 border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-amber-500 rotate-45 border border-white" />
            <div>
              <h2
                className="text-lg sm:text-xl font-extrabold tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-500 drop-shadow-sm"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '13px' }}
              >
                SCENARIO ARCHIVE
              </h2>
              <p className="text-[10px] text-slate-300 font-bold uppercase mt-0.5">
                Frontline Missions ({scenarios.length} / {MAX_CUSTOM_SCENARIOS} slots used)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImportClick}
              disabled={scenarios.length >= MAX_CUSTOM_SCENARIOS}
              title="Import .tankwar.json scenario file"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-all ${
                scenarios.length < MAX_CUSTOM_SCENARIOS
                  ? 'bg-[#1e293b] hover:bg-slate-700 text-sky-300 border-sky-400 active:scale-95'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import JSON</span>
            </button>

            <button
              onClick={onCreateNew}
              disabled={scenarios.length >= MAX_CUSTOM_SCENARIOS}
              title="Open Builder to construct a new scenario"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold border shadow-md transition-all ${
                scenarios.length < MAX_CUSTOM_SCENARIOS
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-300 active:scale-95 shadow-amber-950/40'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-950/80 border-b border-red-500 px-4 py-2 text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scenarios Grid / List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          {scenarios.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 p-8 space-y-3">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm font-bold">No custom scenarios saved yet.</p>
              <p className="text-slate-500 text-xs">
                Create a customized frontline map in the builder or import a shared JSON scenario.
              </p>
              <button
                onClick={onCreateNew}
                className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold border border-amber-400 text-xs"
              >
                Launch Scenario Builder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarios.map((sc) => {
                // Calculate quick counts
                let cityCount = 0;
                let tankCount = 0;
                const total = sc.gridSize * sc.gridSize;
                for (let i = 0; i < total; i++) {
                  if (sc.cities[i] === 1) cityCount++;
                  if (sc.tanks[i] > 0) tankCount += sc.tanks[i];
                }

                return (
                  <div
                    key={sc.id}
                    className="bg-[#111827] border-2 border-slate-800 hover:border-slate-600 p-3.5 flex flex-col justify-between space-y-3 transition-colors group"
                  >
                    {/* Top Row: Name and Meta */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-white text-sm tracking-wide group-hover:text-amber-300 transition-colors">
                          {sc.name}
                        </h3>
                        <span className="text-[9px] text-slate-500 tabular-nums shrink-0">
                          {new Date(sc.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {sc.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {sc.description}
                        </p>
                      )}
                    </div>

                    {/* Middle Row: Tactical Parameters */}
                    <div className="grid grid-cols-3 gap-2 bg-[#090d16] p-2 border border-slate-800 text-[10px]">
                      <div className="flex items-center gap-1.5 text-sky-300">
                        <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>
                          {sc.gridSize}×{sc.gridSize}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-300">
                        <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>1 vs {sc.numAiPlayers} AI</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{cityCount} Cities</span>
                      </div>

                      <div className="col-span-3 flex items-center justify-between pt-1 border-t border-slate-800/80 text-[9px]">
                        <span className="flex items-center gap-1 text-slate-400">
                          {sc.fogOfWar ? (
                            <>
                              <EyeOff className="w-3 h-3 text-purple-400" />
                              <span>Fog of War ON</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-sky-400" />
                              <span>Fog Disabled</span>
                            </>
                          )}
                        </span>
                        <span className="text-slate-400">{tankCount} Starting Tanks</span>
                      </div>
                    </div>

                    {/* Bottom Row: Action Toolbar */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onEditScenario(sc)}
                          title="Open and modify in Scenario Builder"
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-[#1e293b] hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        >
                          <Pencil className="w-3 h-3 text-amber-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleExport(sc)}
                          title="Download as .tankwar.json file"
                          className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(sc.id, sc.name)}
                          title="Delete scenario from slot"
                          className="p-1 hover:bg-red-950 text-slate-500 hover:text-red-400 border border-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => onPlayScenario(sc)}
                        title="Deploy into battle on this map"
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 active:scale-95 shadow-md shadow-emerald-950/40 transition-all"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Play</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0b0f19] border-t-2 border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>
            Storage: <strong className="text-amber-400">{scenarios.length}</strong> /{' '}
            <strong className="text-white">{MAX_CUSTOM_SCENARIOS}</strong> scenarios
          </span>
          <span className="hidden sm:inline">
            Export scenarios to JSON to back them up or share with friends.
          </span>
        </div>
      </div>
    </div>
  );
};
