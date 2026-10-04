import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CustomScenario, PlayerId, AiPlaystyle } from '../types/game';
import { saveScenario, exportScenarioToJson } from '../utils/scenarioStorage';
import { retroAudio } from '../audio/retroAudio';
import {
  Pencil,
  PaintBucket,
  Eraser,
  Save,
  Download,
  Play,
  X,
  Sliders,
  Eye,
  EyeOff,
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  TreePine,
  Waves,
  Square,
  Building2,
  Crown,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ScenarioBuilderModalProps {
  initialScenario?: CustomScenario | null;
  onPlayScenario: (scenario: CustomScenario) => void;
  onClose: () => void;
}

type ToolMode = 'terrain' | 'owner' | 'city' | 'tank' | 'erase';
type TerrainTool = 0 | 1 | 2; // 0: plain, 1: forest, 2: water
type BrushShape = 1 | 2 | 3; // 1x1, 2x2, 3x3

export const ScenarioBuilderModal: React.FC<ScenarioBuilderModalProps> = ({
  initialScenario,
  onPlayScenario,
  onClose,
}) => {
  // Scenario Config State
  const [scenarioName, setScenarioName] = useState<string>(
    initialScenario?.name || 'My Custom Scenario'
  );
  const [description, setDescription] = useState<string>(
    initialScenario?.description || 'Custom crafted frontline scenario'
  );
  const [gridSize, setGridSize] = useState<number>(initialScenario?.gridSize || 30);
  const [numAiPlayers, setNumAiPlayers] = useState<number>(initialScenario?.numAiPlayers || 1);
  const [fogOfWar, setFogOfWar] = useState<boolean>(
    initialScenario ? initialScenario.fogOfWar : true
  );
  const [aiPlaystyles, setAiPlaystyles] = useState<Record<number, AiPlaystyle>>(
    initialScenario?.aiPlaystyles || { 2: 'berserk', 3: 'balanced', 4: 'defensive' }
  );

  // Editor Tool States
  const [toolMode, setToolMode] = useState<ToolMode>('terrain');
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainTool>(2); // default to water for barrier building
  const [selectedOwner, setSelectedOwner] = useState<PlayerId>(1); // default to Human Player
  const [brushSize, setBrushSize] = useState<BrushShape>(1);
  const [isBucketFill, setIsBucketFill] = useState<boolean>(false);
  const [makeCapitalCity, setMakeCapitalCity] = useState<boolean>(false);

  // Grid Data Arrays
  const [terrain, setTerrain] = useState<number[]>(() => {
    if (initialScenario && initialScenario.gridSize === gridSize) {
      return [...initialScenario.terrain];
    }
    return new Array(gridSize * gridSize).fill(0);
  });
  const [owners, setOwners] = useState<number[]>(() => {
    if (initialScenario && initialScenario.gridSize === gridSize) {
      return [...initialScenario.owners];
    }
    return new Array(gridSize * gridSize).fill(0);
  });
  const [tanks, setTanks] = useState<number[]>(() => {
    if (initialScenario && initialScenario.gridSize === gridSize) {
      return [...initialScenario.tanks];
    }
    return new Array(gridSize * gridSize).fill(0);
  });
  const [cities, setCities] = useState<number[]>(() => {
    if (initialScenario && initialScenario.gridSize === gridSize) {
      return [...initialScenario.cities];
    }
    return new Array(gridSize * gridSize).fill(0);
  });
  const [capitals, setCapitals] = useState<Record<number, { x: number; y: number }>>(() => {
    if (initialScenario?.capitals) {
      return { ...initialScenario.capitals };
    }
    return {};
  });

  // UI Feedback
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Canvas View State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(22);
  const [camera, setCamera] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPointerDownRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle resizing grid dimensions
  const handleResizeGrid = (newSize: number) => {
    if (newSize === gridSize) return;
    const oldSize = gridSize;
    const total = newSize * newSize;
    const nextTerrain = new Array(total).fill(0);
    const nextOwners = new Array(total).fill(0);
    const nextTanks = new Array(total).fill(0);
    const nextCities = new Array(total).fill(0);

    // Copy overlapping tiles
    for (let y = 0; y < Math.min(oldSize, newSize); y++) {
      for (let x = 0; x < Math.min(oldSize, newSize); x++) {
        const oldIdx = y * oldSize + x;
        const newIdx = y * newSize + x;
        nextTerrain[newIdx] = terrain[oldIdx] ?? 0;
        nextOwners[newIdx] = owners[oldIdx] ?? 0;
        nextTanks[newIdx] = tanks[oldIdx] ?? 0;
        nextCities[newIdx] = cities[oldIdx] ?? 0;
      }
    }

    setGridSize(newSize);
    setTerrain(nextTerrain);
    setOwners(nextOwners);
    setTanks(nextTanks);
    setCities(nextCities);

    // Adjust camera to fit
    setCamera({ x: 0, y: 0 });
    retroAudio.playClick();
    showNotice(`Grid resized to ${newSize} × ${newSize}`);
  };

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice(null);
    }, 3000);
  };

  // Helper to compile current state to CustomScenario
  const buildCurrentScenario = (): CustomScenario => {
    return {
      id: initialScenario?.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: scenarioName.trim() || 'Untitled Scenario',
      description: description.trim() || undefined,
      createdAt: Date.now(),
      gridSize,
      numAiPlayers,
      fogOfWar,
      aiPlaystyles,
      terrain: [...terrain],
      owners: [...owners],
      tanks: [...tanks],
      cities: [...cities],
      capitals: { ...capitals },
    };
  };

  // Validation Checks
  const getValidationIssues = (): string[] => {
    const issues: string[] = [];
    const total = gridSize * gridSize;

    let p1Cities = 0;
    let p1Tanks = 0;
    for (let i = 0; i < total; i++) {
      if (owners[i] === 1 && cities[i] === 1) p1Cities++;
      if (owners[i] === 1 && tanks[i] > 0) p1Tanks += tanks[i];
    }

    if (p1Cities === 0) {
      issues.push('Blue Guard (Human Player 1) needs at least 1 city.');
    }

    for (let aiId = 2; aiId <= 1 + numAiPlayers; aiId++) {
      let aiCities = 0;
      for (let i = 0; i < total; i++) {
        if (owners[i] === aiId && cities[i] === 1) aiCities++;
      }
      if (aiCities === 0) {
        const name = aiId === 2 ? 'Red Legion' : aiId === 3 ? 'Green Fleet' : 'Gold Dominion';
        issues.push(`${name} (AI Player ${aiId}) needs at least 1 city.`);
      }
    }

    return issues;
  };

  // Save to 10-slot manager
  const handleSave = () => {
    const scenario = buildCurrentScenario();
    const result = saveScenario(scenario);
    if (result.success) {
      retroAudio.playTurnStart();
      showNotice('★ Scenario saved to local library!');
    } else {
      retroAudio.playAttackFailed();
      alert(result.error || 'Failed to save scenario');
    }
  };

  // Export JSON file
  const handleExport = () => {
    const scenario = buildCurrentScenario();
    exportScenarioToJson(scenario);
    retroAudio.playClick();
    showNotice('Downloaded scenario JSON file!');
  };

  // Play Now
  const handlePlayNow = () => {
    const issues = getValidationIssues();
    if (issues.length > 0) {
      retroAudio.playAttackFailed();
      alert(`Cannot launch scenario yet:\n• ${issues.join('\n• ')}`);
      return;
    }

    const scenario = buildCurrentScenario();
    saveScenario(scenario); // auto-save local copy
    retroAudio.playDeploy();
    onPlayScenario(scenario);
  };

  // Paint tile logic
  const paintTileAt = useCallback(
    (tx: number, ty: number) => {
      if (tx < 0 || tx >= gridSize || ty < 0 || ty >= gridSize) return;

      const half = Math.floor(brushSize / 2);
      const tilesToUpdate: number[] = [];

      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const cx = tx + dx;
          const cy = ty + dy;
          if (cx >= 0 && cx < gridSize && cy >= 0 && cy < gridSize) {
            tilesToUpdate.push(cy * gridSize + cx);
          }
        }
      }

      if (isBucketFill && tilesToUpdate.length > 0) {
        // Flood fill algorithm
        const startIdx = ty * gridSize + tx;
        const targetTerrain = terrain[startIdx];
        const targetOwner = owners[startIdx];

        const queue: number[] = [startIdx];
        const visited = new Uint8Array(gridSize * gridSize);
        visited[startIdx] = 1;

        const nextTerrain = [...terrain];
        const nextOwners = [...owners];
        const nextCities = [...cities];
        const nextTanks = [...tanks];

        while (queue.length > 0) {
          const curr = queue.shift()!;
          const cx = curr % gridSize;
          const cy = Math.floor(curr / gridSize);

          if (toolMode === 'terrain') {
            nextTerrain[curr] = selectedTerrain;
            if (selectedTerrain === 2) {
              // Water removes cities and tanks
              nextCities[curr] = 0;
              nextTanks[curr] = 0;
            }
          } else if (toolMode === 'owner') {
            nextOwners[curr] = selectedOwner;
          }

          // 4-directional flood fill
          const dirs = [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
          ];
          for (const [ddx, ddy] of dirs) {
            const nx = cx + ddx;
            const ny = cy + ddy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
              const nIdx = ny * gridSize + nx;
              if (visited[nIdx] === 0) {
                const match =
                  toolMode === 'terrain'
                    ? terrain[nIdx] === targetTerrain
                    : owners[nIdx] === targetOwner;
                if (match) {
                  visited[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }
        }

        setTerrain(nextTerrain);
        setOwners(nextOwners);
        setCities(nextCities);
        setTanks(nextTanks);
        return;
      }

      // Normal Brush Painting
      setTerrain((prevT) => {
        const nextT = [...prevT];
        setOwners((prevO) => {
          const nextO = [...prevO];
          setCities((prevC) => {
            const nextC = [...prevC];
            setTanks((prevTk) => {
              const nextTk = [...prevTk];

              for (const idx of tilesToUpdate) {
                if (toolMode === 'terrain') {
                  nextT[idx] = selectedTerrain;
                  if (selectedTerrain === 2) {
                    // Impassable water: cannot contain cities or tanks
                    nextC[idx] = 0;
                    nextTk[idx] = 0;
                  }
                } else if (toolMode === 'owner') {
                  nextO[idx] = selectedOwner;
                } else if (toolMode === 'city') {
                  // Cities cannot be on water
                  if (nextT[idx] !== 2) {
                    nextC[idx] = 1;
                    nextO[idx] = selectedOwner; // set city to selected owner
                    nextTk[idx] = 0; // cities cannot hold tanks
                    if (makeCapitalCity && selectedOwner !== 0) {
                      setCapitals((prevCaps) => ({
                        ...prevCaps,
                        [selectedOwner]: { x: idx % gridSize, y: Math.floor(idx / gridSize) },
                      }));
                    }
                  }
                } else if (toolMode === 'tank') {
                  // Tanks cannot be inside cities or in water
                  if (nextT[idx] !== 2 && nextC[idx] !== 1) {
                    nextTk[idx] = Math.min(10, (nextTk[idx] || 0) + 1);
                    nextO[idx] = selectedOwner; // assign tank to selected owner
                  }
                } else if (toolMode === 'erase') {
                  nextT[idx] = 0; // plain
                  nextO[idx] = 0; // neutral
                  nextC[idx] = 0;
                  nextTk[idx] = 0;
                }
              }

              return nextTk;
            });
            return nextC;
          });
          return nextO;
        });
        return nextT;
      });
    },
    [
      gridSize,
      brushSize,
      isBucketFill,
      toolMode,
      selectedTerrain,
      selectedOwner,
      makeCapitalCity,
      terrain,
      owners,
      cities,
      tanks,
    ]
  );

  // Quick procedural brush presets
  const handleGenerateRiverBarrier = () => {
    const nextTerrain = [...terrain];
    const midX = Math.floor(gridSize / 2);

    for (let y = 0; y < gridSize; y++) {
      const rx = midX + Math.round(Math.sin(y * 0.45) * 4);
      for (let w = -1; w <= 1; w++) {
        const tx = rx + w;
        if (tx >= 0 && tx < gridSize) {
          const idx = y * gridSize + tx;
          nextTerrain[idx] = 2; // water
        }
      }
    }

    // Add 2 natural bridges
    const bridge1 = Math.floor(gridSize * 0.25);
    const bridge2 = Math.floor(gridSize * 0.75);
    for (const by of [bridge1, bridge2]) {
      for (let dx = -3; dx <= 3; dx++) {
        const tx = midX + dx;
        if (tx >= 0 && tx < gridSize) {
          nextTerrain[by * gridSize + tx] = 0; // land bridge
        }
      }
    }

    setTerrain(nextTerrain);
    retroAudio.playDeploy();
    showNotice('Generated winding river barrier with 2 bridges!');
  };

  const handleClearAll = () => {
    if (confirm('Clear entire map to blank grassland?')) {
      const total = gridSize * gridSize;
      setTerrain(new Array(total).fill(0));
      setOwners(new Array(total).fill(0));
      setTanks(new Array(total).fill(0));
      setCities(new Array(total).fill(0));
      setCapitals({});
      retroAudio.playClick();
      showNotice('Cleared map to neutral plain.');
    }
  };

  // Canvas Mouse / Pointer Events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.button === 2) {
      // Right click: start panning
      isPanningRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0) {
      // Left click: start painting
      isPointerDownRef.current = true;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const tileX = Math.floor((clickX + camera.x) / zoom);
      const tileY = Math.floor((clickY + camera.y) / zoom);
      paintTileAt(tileX, tileY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const tileX = Math.floor((clickX + camera.x) / zoom);
    const tileY = Math.floor((clickY + camera.y) / zoom);

    if (tileX >= 0 && tileX < gridSize && tileY >= 0 && tileY < gridSize) {
      setHoverCoord({ x: tileX, y: tileY });
    } else {
      setHoverCoord(null);
    }

    if (isPanningRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setCamera((prev) => ({ x: prev.x - dx, y: prev.y - dy }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isPointerDownRef.current && !isBucketFill) {
      paintTileAt(tileX, tileY);
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(36, z + 2));
    } else {
      setZoom((z) => Math.max(12, z - 2));
    }
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startCol = Math.max(0, Math.floor(camera.x / zoom));
    const endCol = Math.min(gridSize - 1, Math.ceil((camera.x + canvas.width) / zoom));
    const startRow = Math.max(0, Math.floor(camera.y / zoom));
    const endRow = Math.min(gridSize - 1, Math.ceil((camera.y + canvas.height) / zoom));

    // Player Colors palette
    const playerColors: Record<number, { bg: string; border: string }> = {
      0: { bg: '#475569', border: '#64748B' }, // Neutral grey
      1: { bg: '#2563EB', border: '#60A5FA' }, // Blue Guard
      2: { bg: '#DC2626', border: '#F87171' }, // Red Legion
      3: { bg: '#16A34A', border: '#4ADE80' }, // Green Fleet
      4: { bg: '#D97706', border: '#FBBF24' }, // Gold Dominion
    };

    // 1. Draw Grid Tiles
    for (let ty = startRow; ty <= endRow; ty++) {
      for (let tx = startCol; tx <= endCol; tx++) {
        const idx = ty * gridSize + tx;
        const screenX = tx * zoom - camera.x;
        const screenY = ty * zoom - camera.y;

        const terr = terrain[idx] ?? 0;
        const owner = owners[idx] ?? 0;
        const isCity = cities[idx] === 1;
        const tankCount = tanks[idx] ?? 0;

        // Base Terrain Color
        if (terr === 2) {
          // Water (impassable deep water)
          ctx.fillStyle = '#1D4ED8';
          ctx.fillRect(screenX, screenY, zoom, zoom);
          // Subtle wave ripples
          ctx.fillStyle = '#60A5FA';
          ctx.fillRect(screenX + 2, screenY + 4, zoom - 4, 1.5);
          ctx.fillRect(screenX + 4, screenY + zoom - 5, zoom - 8, 1.5);
        } else if (terr === 1) {
          // Forest
          ctx.fillStyle = '#15803D';
          ctx.fillRect(screenX, screenY, zoom, zoom);
          // Pine tree pixel dot
          ctx.fillStyle = '#14532D';
          ctx.fillRect(screenX + 3, screenY + 3, zoom - 6, zoom - 6);
        } else {
          // Plain Grassland
          ctx.fillStyle = '#3F6212';
          ctx.fillRect(screenX, screenY, zoom, zoom);
        }

        // Faction Territory Overlay (Semi-transparent color block)
        if (terr !== 2 && owner !== 0) {
          ctx.fillStyle = `${playerColors[owner].bg}77`;
          ctx.fillRect(screenX, screenY, zoom, zoom);
        }

        // Tile Grid Lines
        ctx.strokeStyle = '#00000033';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, zoom, zoom);

        // Draw Cities
        if (isCity) {
          const pal = playerColors[owner];
          // City base structure
          ctx.fillStyle = pal.bg;
          ctx.fillRect(screenX + 2, screenY + 2, zoom - 4, zoom - 4);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(screenX + 2, screenY + 2, zoom - 4, zoom - 4);

          // Tower Roof
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(screenX + zoom / 2 - 2, screenY + 4, 4, zoom - 8);

          // Capital Crown Indicator
          const isCap = capitals[owner]?.x === tx && capitals[owner]?.y === ty;
          if (isCap) {
            ctx.fillStyle = '#F59E0B';
            ctx.fillRect(screenX + 3, screenY + 2, zoom - 6, 3);
          }
        }

        // Draw Tanks
        if (tankCount > 0 && !isCity && terr !== 2) {
          const pal = playerColors[owner];
          // Tank body
          ctx.fillStyle = pal.bg;
          ctx.fillRect(screenX + 3, screenY + zoom / 2 - 3, zoom - 6, 6);
          // Turret barrel
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(screenX + zoom / 2 - 1.5, screenY + 3, 3, 4);

          // Tank count badge if > 1
          if (tankCount > 1) {
            ctx.fillStyle = '#000000CC';
            ctx.fillRect(screenX + zoom - 9, screenY + zoom - 9, 8, 8);
            ctx.fillStyle = '#FBBF24';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(String(tankCount), screenX + zoom - 7, screenY + zoom - 2);
          }
        }
      }
    }

    // 2. Draw Hover Cursor Box
    if (hoverCoord) {
      const hx = hoverCoord.x * zoom - camera.x;
      const hy = hoverCoord.y * zoom - camera.y;
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx, hy, zoom, zoom);
    }
  }, [camera, zoom, gridSize, terrain, owners, cities, tanks, capitals, hoverCoord]);

  // Count summary stats
  const cityCounts = [0, 0, 0, 0, 0];
  const tankCounts = [0, 0, 0, 0, 0];
  const territoryCounts = [0, 0, 0, 0, 0];
  for (let i = 0; i < gridSize * gridSize; i++) {
    const o = owners[i];
    territoryCounts[o]++;
    if (cities[i] === 1) cityCounts[o]++;
    if (tanks[i] > 0) tankCounts[o] += tanks[i];
  }

  const factionNames: Record<number, { name: string; color: string }> = {
    0: { name: 'Neutral', color: '#94A3B8' },
    1: { name: 'Blue Guard (You)', color: '#3B82F6' },
    2: { name: 'Red Legion (AI)', color: '#EF4444' },
    3: { name: 'Green Fleet (AI)', color: '#22C55E' },
    4: { name: 'Gold Dominion (AI)', color: '#F59E0B' },
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f19] text-slate-200 select-none font-mono">
      {/* Top Retro Control Header */}
      <header className="bg-[#0f172a] border-b-2 border-slate-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 bg-amber-500 rotate-45 border border-white" />
          <div>
            <h1
              className="text-base sm:text-lg font-extrabold tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-600"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '11px' }}
            >
              SCENARIO BUILDER
            </h1>
            <p className="text-[9px] text-slate-400">Tactical Frontline Map Architect</p>
          </div>
        </div>

        {/* Status Toast */}
        {statusNotice && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            title="Save scenario into local library (up to 10 slots)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#1e293b] hover:bg-slate-700 text-slate-200 border border-slate-600 active:scale-95 transition-all"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Save</span>
          </button>

          <button
            onClick={handleExport}
            title="Export scenario as .tankwar.json file"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#1e293b] hover:bg-slate-700 text-slate-200 border border-slate-600 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handlePlayNow}
            title="Play scenario immediately"
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 active:scale-95 shadow-md shadow-emerald-950/50 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Play Map</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 ml-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Tool Palette & Scenario Settings */}
        <div className="w-64 sm:w-72 bg-[#111827] border-r-2 border-slate-800 p-3 flex flex-col space-y-3 overflow-y-auto shrink-0 text-xs">
          {/* Metadata Section */}
          <div className="space-y-1.5 bg-[#0b0f19] p-2.5 border border-slate-800">
            <label className="text-[10px] font-bold uppercase text-amber-400 block">
              Scenario Name
            </label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-hidden focus:border-amber-400"
              placeholder="e.g. Iron Fortress Crossing"
            />

            <label className="text-[10px] font-bold uppercase text-slate-400 block pt-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 px-2 py-1 text-xs text-slate-300 focus:outline-hidden"
              placeholder="Brief tactical briefing..."
            />
          </div>

          {/* Map Size & Players Section */}
          <div className="space-y-2 bg-[#0b0f19] p-2.5 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-sky-400">Map Dimension</span>
              <span className="font-bold text-amber-400 tabular-nums">
                {gridSize} × {gridSize}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[20, 30, 40, 50].map((sz) => (
                <button
                  key={sz}
                  onClick={() => handleResizeGrid(sz)}
                  className={`py-1 text-center border text-[10px] font-bold transition-all ${
                    gridSize === sz
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-[#1e293b] text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {sz}×{sz}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] text-slate-400">Freedom Slider:</span>
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={gridSize}
                onChange={(e) => handleResizeGrid(Number(e.target.value))}
                className="flex-1 accent-blue-500 cursor-pointer"
              />
              <span className="text-right text-[10px] font-bold text-sky-300 w-6">
                {gridSize}
              </span>
            </div>

            {/* Players & Fog */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-400">AI Rivals:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumAiPlayers(num)}
                      className={`px-2 py-0.5 text-[10px] font-bold border ${
                        numAiPlayers === num
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-[#1e293b] text-slate-400 border-slate-700'
                      }`}
                    >
                      {num} AI
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-purple-400">Fog of War:</span>
                <button
                  onClick={() => setFogOfWar(!fogOfWar)}
                  className={`px-2 py-0.5 text-[10px] font-bold border flex items-center gap-1 ${
                    fogOfWar
                      ? 'bg-purple-700 text-white border-purple-400'
                      : 'bg-sky-700 text-white border-sky-400'
                  }`}
                >
                  {fogOfWar ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{fogOfWar ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tool Modes */}
          <div className="space-y-1.5 bg-[#0b0f19] p-2.5 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Select Tool Category
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setToolMode('terrain')}
                className={`p-1.5 flex items-center justify-center gap-1.5 border text-[11px] font-bold ${
                  toolMode === 'terrain'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-[#1e293b] text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Waves className="w-3.5 h-3.5 text-cyan-300" />
                <span>1. Terrain</span>
              </button>

              <button
                onClick={() => setToolMode('owner')}
                className={`p-1.5 flex items-center justify-center gap-1.5 border text-[11px] font-bold ${
                  toolMode === 'owner'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-[#1e293b] text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Square className="w-3.5 h-3.5 text-amber-300" />
                <span>2. Territory</span>
              </button>

              <button
                onClick={() => setToolMode('city')}
                className={`p-1.5 flex items-center justify-center gap-1.5 border text-[11px] font-bold ${
                  toolMode === 'city'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-sm'
                    : 'bg-[#1e293b] text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-amber-200" />
                <span>3. Cities</span>
              </button>

              <button
                onClick={() => setToolMode('tank')}
                className={`p-1.5 flex items-center justify-center gap-1.5 border text-[11px] font-bold ${
                  toolMode === 'tank'
                    ? 'bg-red-600 text-white border-red-400 shadow-sm'
                    : 'bg-[#1e293b] text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-red-300" />
                <span>4. Tanks</span>
              </button>
            </div>
          </div>

          {/* Active Palette Config */}
          <div className="space-y-2 bg-[#0b0f19] p-2.5 border border-slate-800">
            {toolMode === 'terrain' && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-cyan-400 block">
                  Terrain Type
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setSelectedTerrain(0)}
                    className={`p-1.5 border text-center text-[10px] font-bold ${
                      selectedTerrain === 0
                        ? 'bg-lime-800 text-white border-lime-400'
                        : 'bg-[#1e293b] text-slate-400 border-slate-700'
                    }`}
                  >
                    Grass
                  </button>
                  <button
                    onClick={() => setSelectedTerrain(1)}
                    className={`p-1.5 border text-center text-[10px] font-bold ${
                      selectedTerrain === 1
                        ? 'bg-emerald-800 text-white border-emerald-400'
                        : 'bg-[#1e293b] text-slate-400 border-slate-700'
                    }`}
                  >
                    Forest
                  </button>
                  <button
                    onClick={() => setSelectedTerrain(2)}
                    className={`p-1.5 border text-center text-[10px] font-bold ${
                      selectedTerrain === 2
                        ? 'bg-blue-700 text-white border-cyan-400'
                        : 'bg-[#1e293b] text-slate-400 border-slate-700'
                    }`}
                  >
                    Water (Barrier)
                  </button>
                </div>
                <p className="text-[9px] text-cyan-300/80">
                  Water forms impassable barriers that tanks cannot cross and supply lines cannot bridge.
                </p>
              </div>
            )}

            {(toolMode === 'owner' || toolMode === 'city' || toolMode === 'tank') && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-amber-400 block">
                  Faction / Owner
                </span>
                <div className="space-y-1">
                  {[
                    { id: 0, name: 'Neutral Grey', color: '#94A3B8' },
                    { id: 1, name: 'Blue Guard (Human 1)', color: '#3B82F6' },
                    { id: 2, name: 'Red Legion (AI 2)', color: '#EF4444' },
                    ...(numAiPlayers >= 2
                      ? [{ id: 3, name: 'Green Fleet (AI 3)', color: '#22C55E' }]
                      : []),
                    ...(numAiPlayers >= 3
                      ? [{ id: 4, name: 'Gold Dominion (AI 4)', color: '#F59E0B' }]
                      : []),
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedOwner(f.id as PlayerId)}
                      className={`w-full px-2 py-1 text-left flex items-center justify-between border text-[10px] font-bold transition-all ${
                        selectedOwner === f.id
                          ? 'border-white bg-[#1e293b] text-white shadow-sm'
                          : 'border-slate-800 bg-[#090d16] text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 border border-black"
                          style={{ backgroundColor: f.color }}
                        />
                        <span>{f.name}</span>
                      </div>
                      <span className="text-[9px] opacity-70">
                        {territoryCounts[f.id]} tiles
                      </span>
                    </button>
                  ))}
                </div>

                {toolMode === 'city' && selectedOwner !== 0 && (
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={makeCapitalCity}
                      onChange={(e) => setMakeCapitalCity(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Designate as Player Capital
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Brush Controls & Bucket Fill */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Brush Options
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setBrushSize(b as BrushShape);
                      setIsBucketFill(false);
                    }}
                    className={`flex-1 py-1 text-center border text-[10px] font-bold ${
                      brushSize === b && !isBucketFill
                        ? 'bg-amber-600 text-white border-amber-400'
                        : 'bg-[#1e293b] text-slate-400 border-slate-700'
                    }`}
                  >
                    {b}×{b}
                  </button>
                ))}

                <button
                  onClick={() => setIsBucketFill(!isBucketFill)}
                  title="Bucket Fill Contiguous Area"
                  className={`px-2.5 py-1 flex items-center justify-center border text-[10px] font-bold ${
                    isBucketFill
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-[#1e293b] text-slate-400 border-slate-700'
                  }`}
                >
                  <PaintBucket className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setToolMode('erase')}
                  title="Eraser (Reset Tile to Plain)"
                  className={`px-2.5 py-1 flex items-center justify-center border text-[10px] font-bold ${
                    toolMode === 'erase'
                      ? 'bg-red-600 text-white border-red-400'
                      : 'bg-[#1e293b] text-slate-400 border-slate-700'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Procedural Generators */}
          <div className="space-y-1 bg-[#0b0f19] p-2.5 border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Quick Generators
            </span>
            <button
              onClick={handleGenerateRiverBarrier}
              className="w-full py-1 px-2 text-left border border-slate-700 bg-[#1e293b] hover:bg-slate-700 text-cyan-300 text-[10px] font-bold flex items-center gap-1.5"
            >
              <Waves className="w-3 h-3" />
              <span>Draw Central River Barrier</span>
            </button>
            <button
              onClick={handleClearAll}
              className="w-full py-1 px-2 text-left border border-slate-700 bg-[#1e293b] hover:bg-slate-700 text-red-300 text-[10px] font-bold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Entire Map</span>
            </button>
          </div>
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 relative flex flex-col bg-[#070a12] overflow-hidden">
          {/* Canvas Floating Toolbar */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-[#0f172a]/90 backdrop-blur-xs p-1 border border-slate-700 shadow-md">
            <button
              onClick={() => setZoom((z) => Math.min(36, z + 2))}
              title="Zoom In"
              className="p-1 hover:bg-slate-700 text-slate-300"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[10px] px-1 font-bold text-slate-400 tabular-nums">{zoom}px</span>
            <button
              onClick={() => setZoom((z) => Math.max(12, z - 2))}
              title="Zoom Out"
              className="p-1 hover:bg-slate-700 text-slate-300"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-1" />
            <button
              onClick={() => setCamera({ x: 0, y: 0 })}
              title="Center Canvas"
              className="p-1 hover:bg-slate-700 text-sky-400"
            >
              <Compass className="w-4 h-4" />
            </button>
          </div>

          {/* Coordinate Readout */}
          <div className="absolute top-3 right-3 z-10 bg-[#0f172a]/90 px-2.5 py-1 border border-slate-700 text-[10px] text-slate-300 shadow-md flex items-center gap-3">
            <span>
              Tile:{' '}
              <strong className="text-amber-400 tabular-nums">
                {hoverCoord ? `(${hoverCoord.x}, ${hoverCoord.y})` : '--'}
              </strong>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">R-Click Drag: Pan Canvas</span>
          </div>

          {/* HTML5 Canvas */}
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            className="w-full h-full cursor-crosshair"
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          />

          {/* Bottom Live Faction Balance Bar */}
          <div className="bg-[#0b0f19] border-t border-slate-800 px-4 py-2 flex items-center justify-between shrink-0 text-[11px]">
            <div className="flex items-center gap-4 overflow-x-auto py-0.5">
              {[1, 2, 3, 4]
                .filter((p) => p === 1 || p <= 1 + numAiPlayers)
                .map((p) => {
                  const info = factionNames[p];
                  return (
                    <div key={p} className="flex items-center gap-1.5 whitespace-nowrap">
                      <div className="w-2 h-2" style={{ backgroundColor: info.color }} />
                      <span className="font-bold text-slate-200">{info.name}:</span>
                      <span className="text-amber-300 font-bold">{cityCounts[p]} Cities</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300">{tankCounts[p]} Tanks</span>
                    </div>
                  );
                })}
            </div>

            {/* Validation Pill */}
            {getValidationIssues().length === 0 ? (
              <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 font-bold text-[10px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Map Ready to Play</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 text-amber-400 font-bold text-[10px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{getValidationIssues()[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
