/**
 * Advance Grid: Tank Wars (32-Bit GBA Tactical War)
 * Procedural strategy game with customizable grid dimensions, computer commanders,
 * continental cities, auto-pickup all tanks, impassable water, and unlimited tank reuse.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  City,
  CombatOdds,
  CustomScenario,
  GameLog,
  GameSettings,
  GRID_SIZE,
  InteractionMode,
  PlayerId,
  PlayerInfo,
  setGlobalGridSize,
} from './types/game';
import { generateTacticalMap } from './utils/mapGenerator';
import { calculateCombatOdds, getNeighbors8 } from './utils/combat';
import { executeAdjacentDeathStateCaptures, updateAllSupplyStates } from './utils/supplyLines';
import { PixelRenderer } from './utils/pixelRenderer';
import { retroAudio } from './audio/retroAudio';
import { executeAiCommanderTurn } from './utils/aiCommander';
import { GbaHeader } from './components/GbaHeader';
import { Minimap } from './components/Minimap';
import { ActionToolbar } from './components/ActionToolbar';
import { RulesGuideModal } from './components/RulesGuideModal';
import { GameOverModal } from './components/GameOverModal';
import { StartMenuModal } from './components/StartMenuModal';
import { ScenarioBuilderModal } from './components/ScenarioBuilderModal';
import { ScenarioListModal } from './components/ScenarioListModal';
import { WebsitePortalHeader } from './components/WebsitePortalHeader';

export default function App() {
  // Minimalist Website Shell: standard embedded frame vs full-window/fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Game Configuration & Settings State (Fog of War configured on New Game screen only)
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    gridSize: 50,
    numAiPlayers: 3,
    totalCities: 50,
    fogOfWar: true,
  });
  const [currentGridSize, setCurrentGridSize] = useState<number>(50);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState<boolean>(true); // Show menu screen at start

  // Scenario Workshop & Builder States (supports up to 10 custom scenarios, download/import, full playability)
  const [isScenarioListOpen, setIsScenarioListOpen] = useState<boolean>(false);
  const [isScenarioBuilderOpen, setIsScenarioBuilderOpen] = useState<boolean>(false);
  const [editingScenario, setEditingScenario] = useState<CustomScenario | null>(null);

  // Core typed arrays for game grid
  const terrainRef = useRef<Uint8Array>(new Uint8Array(50 * 50));
  const ownersRef = useRef<Uint8Array>(new Uint8Array(50 * 50));
  const tanksRef = useRef<Uint8Array>(new Uint8Array(50 * 50));
  const citiesRef = useRef<Uint8Array>(new Uint8Array(50 * 50));
  const deathStatesRef = useRef<Uint8Array>(new Uint8Array(50 * 50));
  const exhaustedTanksRef = useRef<Uint8Array>(new Uint8Array(50 * 50));
  const visibleRef = useRef<Uint8Array>(new Uint8Array(50 * 50));
  const exploredRef = useRef<Uint8Array>(new Uint8Array(50 * 50));
  const failureCountsRef = useRef<Map<number, number>>(new Map());
  const aiExploredRef = useRef<Map<PlayerId, Uint8Array>>(new Map());

  // Game metadata state
  const [cityList, setCityList] = useState<City[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [turnDay, setTurnDay] = useState(1);
  const [activePlayerId, setActivePlayerId] = useState<PlayerId>(1);
  const [isAiTurn, setIsAiTurn] = useState(false);
  const [aiThinkingMessage, setAiThinkingMessage] = useState('');

  // UI & Interaction
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [hoverOdds, setHoverOdds] = useState<{ x: number; y: number; chanceText: string; chanceNum: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('inspect');
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showAllFog, setShowAllFog] = useState(false);
  const [gameOver, setGameOver] = useState<{ isOver: boolean; isVictory: boolean } | null>(null);

  // Camera and Zoom
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(24); // pixels per tile (10 to 32)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixelRenderer>(new PixelRenderer());
  const animTickRef = useRef(0);
  const isRightPanningRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  // Add event log helper
  const addLog = useCallback((text: string, type: GameLog['type'], pId: PlayerId = 1) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        turn: turnDay,
        playerId: pId,
        text,
        type,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 49),
    ]);
  }, [turnDay]);

  // Recalculate fog of war for human player (Player 1)
  const updateHumanVisibility = useCallback((gSize: number = currentGridSize, disableFog: boolean = showAllFog) => {
    const visible = visibleRef.current;
    const explored = exploredRef.current;
    const owners = ownersRef.current;

    visible.fill(0);

    if (disableFog) {
      visible.fill(1);
      explored.fill(1);
      return;
    }

    for (let ty = 0; ty < gSize; ty++) {
      for (let tx = 0; tx < gSize; tx++) {
        const idx = ty * gSize + tx;
        if (owners[idx] === 1) {
          // Human owned tile is visible
          visible[idx] = 1;
          explored[idx] = 1;

          // 8 adjacent neighbors are also visible
          const neighbors = getNeighbors8(tx, ty, gSize);
          for (const n of neighbors) {
            visible[n.index] = 1;
            explored[n.index] = 1;
          }
        }
      }
    }
  }, [currentGridSize, showAllFog]);

  // Update territory and city counts for all players
  const updatePlayerCounts = useCallback((gSize: number = currentGridSize) => {
    const owners = ownersRef.current;
    const cities = citiesRef.current;
    const terr = [0, 0, 0, 0, 0];
    const cityCounts = [0, 0, 0, 0, 0];
    const totalTiles = gSize * gSize;

    for (let i = 0; i < totalTiles; i++) {
      const o = owners[i];
      terr[o]++;
      if (cities[i] === 1) {
        cityCounts[o]++;
      }
    }

    setPlayers((prev) =>
      prev.map((p) => {
        const cCount = cityCounts[p.id] || 0;
        const isElim = p.id !== 0 && cCount === 0;
        const tCount = terr[p.id] || 0;
        const peakTerr = Math.max(p.peakTerritory || 0, tCount);
        const peakCities = Math.max(p.peakCities || 0, cCount);
        const isLosingTerritory = peakTerr > 12 && tCount < peakTerr * 0.85;
        const hasLostCity = peakCities > 1 && cCount < peakCities;
        return {
          ...p,
          territoryCount: tCount,
          citiesCount: cCount,
          isEliminated: isElim,
          peakTerritory: peakTerr,
          peakCities: peakCities,
          isDesperate: p.isAi ? isLosingTerritory || hasLostCity : false,
        };
      })
    );
  }, [currentGridSize]);

  // Initialize new game map with custom settings
  const initGame = useCallback((customSettings?: GameSettings) => {
    const settings = customSettings || gameSettings;
    const targetGridSize = settings.gridSize;
    setGlobalGridSize(targetGridSize);
    setCurrentGridSize(targetGridSize);
    setGameSettings(settings);

    const generated = generateTacticalMap(settings);
    const totalTiles = targetGridSize * targetGridSize;

    // Allocate fresh typed arrays sized exactly for targetGridSize
    terrainRef.current = generated.terrain;
    ownersRef.current = generated.owners;
    tanksRef.current = generated.tanks;
    citiesRef.current = generated.cities;
    deathStatesRef.current = new Uint8Array(totalTiles);
    exhaustedTanksRef.current = new Uint8Array(totalTiles);
    visibleRef.current = new Uint8Array(totalTiles);
    exploredRef.current = new Uint8Array(totalTiles);
    failureCountsRef.current.clear();
    aiExploredRef.current.clear();

    // Initialize individual AI fog-of-war explored maps:
    // If fog is OFF, all AI know all sectors and cities immediately.
    // If fog is ON, each AI has fog just like human player!
    for (let aiId = 2; aiId <= 4; aiId++) {
      const aiExp = new Uint8Array(totalTiles);
      if (!settings.fogOfWar) {
        aiExp.fill(1);
      } else {
        for (let i = 0; i < totalTiles; i++) {
          if (generated.owners[i] === aiId) {
            aiExp[i] = 1;
            const cx = i % targetGridSize;
            const cy = Math.floor(i / targetGridSize);
            const neighbors = getNeighbors8(cx, cy, targetGridSize);
            for (const n of neighbors) {
              aiExp[n.index] = 1;
            }
          }
        }
      }
      aiExploredRef.current.set(aiId as PlayerId, aiExp);
    }

    setCityList(generated.cityList);
    setPlayers(generated.players);
    setTurnDay(1);
    setActivePlayerId(1);
    setIsAiTurn(false);
    setGameOver(null);
    setSelectedTile(null);
    setHoverOdds(null);

    const noFog = !settings.fogOfWar;
    setShowAllFog(noFog);

    // Center camera on Human Capital City
    const humanCapital = generated.players[1];
    const canvasW = canvasRef.current?.width || window.innerWidth || 800;
    const canvasH = canvasRef.current?.height || window.innerHeight || 600;
    setCamera({
      x: humanCapital.capitalX * 24 - canvasW / 2,
      y: humanCapital.capitalY * 24 - canvasH / 2,
    });

    // Update vision for Human
    updateHumanVisibility(targetGridSize, noFog);

    // Check starting supply lines for all factions (water is impassable and does not connect)
    updateAllSupplyStates(
      {
        owners: ownersRef.current,
        tanks: tanksRef.current,
        cities: citiesRef.current,
        deathStates: deathStatesRef.current,
        terrain: terrainRef.current,
      },
      targetGridSize
    );

    setLogs([
      {
        id: 'init-1',
        turn: 1,
        playerId: 1,
        text: `Operation launched on ${targetGridSize}×${targetGridSize} map with ${generated.totalCities} cities and ${settings.numAiPlayers} rival commander(s). Tanks ready at HQ.`,
        type: 'general',
        timestamp: Date.now(),
      },
    ]);
  }, [gameSettings, updateHumanVisibility]);

  // Load and play a custom scenario created or imported in the Scenario Workshop
  const handlePlayCustomScenario = useCallback(
    (scenario: CustomScenario) => {
      const targetGridSize = scenario.gridSize;
      setGlobalGridSize(targetGridSize);
      setCurrentGridSize(targetGridSize);

      const totalTiles = targetGridSize * targetGridSize;

      // Set typed arrays directly from scenario data
      terrainRef.current = new Uint8Array(scenario.terrain);
      ownersRef.current = new Uint8Array(scenario.owners);
      tanksRef.current = new Uint8Array(scenario.tanks);
      citiesRef.current = new Uint8Array(scenario.cities);
      deathStatesRef.current = new Uint8Array(totalTiles);
      exhaustedTanksRef.current = new Uint8Array(totalTiles);
      visibleRef.current = new Uint8Array(totalTiles);
      exploredRef.current = new Uint8Array(totalTiles);
      failureCountsRef.current.clear();
      aiExploredRef.current.clear();

      // Rebuild cityList
      const newCityList: City[] = [];
      const cityNamesPool = [
        'Oakhaven', 'Ironford', 'Sunspire', 'Silvergate', 'Frostfall',
        'Ravenhold', 'Stormwatch', 'Dawnbreak', 'Highwater', 'Pinecrest',
        'Dustmere', 'Shadowfall', 'Clearspring', 'Windmill Hill', 'Stonecross',
        'Emberpeak', 'Rivermouth', 'Ambervale', 'Greywood', 'Redcliff'
      ];
      let cityIdCounter = 0;

      for (let i = 0; i < totalTiles; i++) {
        if (scenario.cities[i] === 1) {
          const cx = i % targetGridSize;
          const cy = Math.floor(i / targetGridSize);
          const owner = scenario.owners[i] as PlayerId;
          const isCap = scenario.capitals?.[owner]?.x === cx && scenario.capitals?.[owner]?.y === cy;
          newCityList.push({
            id: ++cityIdCounter,
            x: cx,
            y: cy,
            name: isCap
              ? `${owner === 1 ? 'Blue' : owner === 2 ? 'Red' : owner === 3 ? 'Green' : 'Gold'} Capital`
              : cityNamesPool[cityIdCounter % cityNamesPool.length] || `City ${cityIdCounter}`,
            owner,
            isCapital: isCap,
          });
        }
      }

      // Count territory and cities per player
      const terrCounts = [0, 0, 0, 0, 0];
      const cCounts = [0, 0, 0, 0, 0];
      for (let i = 0; i < totalTiles; i++) {
        terrCounts[scenario.owners[i]]++;
        if (scenario.cities[i] === 1) cCounts[scenario.owners[i]]++;
      }

      const settings: GameSettings = {
        gridSize: targetGridSize,
        numAiPlayers: scenario.numAiPlayers,
        totalCities: newCityList.length,
        fogOfWar: scenario.fogOfWar,
        aiPlaystyles: scenario.aiPlaystyles,
      };
      setGameSettings(settings);

      const newPlayers: PlayerInfo[] = [
        {
          id: 0,
          name: 'Neutral',
          faction: 'Unaligned Regions',
          color: '#64748B',
          darkColor: '#475569',
          accentColor: '#94A3B8',
          isAi: false,
          tanksInReserve: 0,
          citiesCount: cCounts[0],
          territoryCount: terrCounts[0],
          isEliminated: false,
          capitalX: 0,
          capitalY: 0,
        },
        {
          id: 1,
          name: 'Blue Guard',
          faction: '1st Armored (Human)',
          color: '#2563EB',
          darkColor: '#1D4ED8',
          accentColor: '#60A5FA',
          isAi: false,
          peakTerritory: terrCounts[1],
          peakCities: cCounts[1],
          isDesperate: false,
          tanksInReserve: 0,
          citiesCount: cCounts[1],
          territoryCount: terrCounts[1],
          isEliminated: cCounts[1] === 0,
          capitalX: scenario.capitals?.[1]?.x ?? newCityList.find((c) => c.owner === 1)?.x ?? 2,
          capitalY: scenario.capitals?.[1]?.y ?? newCityList.find((c) => c.owner === 1)?.y ?? 2,
        },
        {
          id: 2,
          name: 'Red Legion',
          faction: 'Crimson Corp (AI)',
          color: '#DC2626',
          darkColor: '#B91C1C',
          accentColor: '#F87171',
          isAi: true,
          playstyle: scenario.aiPlaystyles?.[2] || 'berserk',
          peakTerritory: terrCounts[2],
          peakCities: cCounts[2],
          isDesperate: false,
          tanksInReserve: 0,
          citiesCount: cCounts[2],
          territoryCount: terrCounts[2],
          isEliminated: scenario.numAiPlayers < 1 || cCounts[2] === 0,
          capitalX: scenario.capitals?.[2]?.x ?? newCityList.find((c) => c.owner === 2)?.x ?? 0,
          capitalY: scenario.capitals?.[2]?.y ?? newCityList.find((c) => c.owner === 2)?.y ?? 0,
        },
        {
          id: 3,
          name: 'Green Fleet',
          faction: 'Emerald Div (AI)',
          color: '#16A34A',
          darkColor: '#15803D',
          accentColor: '#4ADE80',
          isAi: true,
          playstyle: scenario.aiPlaystyles?.[3] || 'balanced',
          peakTerritory: terrCounts[3],
          peakCities: cCounts[3],
          isDesperate: false,
          tanksInReserve: 0,
          citiesCount: cCounts[3],
          territoryCount: terrCounts[3],
          isEliminated: scenario.numAiPlayers < 2 || cCounts[3] === 0,
          capitalX: scenario.capitals?.[3]?.x ?? newCityList.find((c) => c.owner === 3)?.x ?? 0,
          capitalY: scenario.capitals?.[3]?.y ?? newCityList.find((c) => c.owner === 3)?.y ?? 0,
        },
        {
          id: 4,
          name: 'Gold Dominion',
          faction: 'Solar Strike (AI)',
          color: '#D97706',
          darkColor: '#B45309',
          accentColor: '#FBBF24',
          isAi: true,
          playstyle: scenario.aiPlaystyles?.[4] || 'defensive',
          peakTerritory: terrCounts[4],
          peakCities: cCounts[4],
          isDesperate: false,
          tanksInReserve: 0,
          citiesCount: cCounts[4],
          territoryCount: terrCounts[4],
          isEliminated: scenario.numAiPlayers < 3 || cCounts[4] === 0,
          capitalX: scenario.capitals?.[4]?.x ?? newCityList.find((c) => c.owner === 4)?.x ?? 0,
          capitalY: scenario.capitals?.[4]?.y ?? newCityList.find((c) => c.owner === 4)?.y ?? 0,
        },
      ];

      setCityList(newCityList);
      setPlayers(newPlayers);
      setTurnDay(1);
      setActivePlayerId(1);
      setIsAiTurn(false);
      setGameOver(null);
      setSelectedTile(null);
      setHoverOdds(null);

      const noFog = !scenario.fogOfWar;
      setShowAllFog(noFog);

      // AI explored vision setup
      for (let aiId = 2; aiId <= 4; aiId++) {
        const aiExp = new Uint8Array(totalTiles);
        if (noFog) {
          aiExp.fill(1);
        } else {
          for (let i = 0; i < totalTiles; i++) {
            if (scenario.owners[i] === aiId) {
              aiExp[i] = 1;
              const cx = i % targetGridSize;
              const cy = Math.floor(i / targetGridSize);
              const neighbors = getNeighbors8(cx, cy, targetGridSize);
              for (const n of neighbors) {
                aiExp[n.index] = 1;
              }
            }
          }
        }
        aiExploredRef.current.set(aiId as PlayerId, aiExp);
      }

      // Center camera on Human Capital
      const humanCapX = newPlayers[1].capitalX;
      const humanCapY = newPlayers[1].capitalY;
      const canvasW = canvasRef.current?.width || window.innerWidth || 800;
      const canvasH = canvasRef.current?.height || window.innerHeight || 600;
      setCamera({
        x: humanCapX * 24 - canvasW / 2,
        y: humanCapY * 24 - canvasH / 2,
      });

      updateHumanVisibility(targetGridSize, noFog);

      updateAllSupplyStates(
        {
          owners: ownersRef.current,
          tanks: tanksRef.current,
          cities: citiesRef.current,
          deathStates: deathStatesRef.current,
          terrain: terrainRef.current,
        },
        targetGridSize
      );

      setLogs([
        {
          id: 'init-custom',
          turn: 1,
          playerId: 1,
          text: `★ Custom Scenario "${scenario.name}" loaded (${targetGridSize}×${targetGridSize}, ${newCityList.length} cities, ${scenario.numAiPlayers} rival AI). Good luck, Commander!`,
          type: 'general',
          timestamp: Date.now(),
        },
      ]);

      setIsStartMenuOpen(false);
      setIsScenarioListOpen(false);
      setIsScenarioBuilderOpen(false);
      retroAudio.playTurnStart();
    },
    [updateHumanVisibility]
  );


  // Run on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Center camera on Human Capital City
  const handleJumpToCapital = useCallback(() => {
    const human = players[1];
    if (human) {
      setCamera({
        x: human.capitalX * zoom - window.innerWidth / 2,
        y: human.capitalY * zoom - window.innerHeight / 2,
      });
      setSelectedTile({ x: human.capitalX, y: human.capitalY });
      retroAudio.playClick();
    }
  }, [players, zoom]);

  // Animation & Rendering loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      animTickRef.current++;
      const canvas = canvasRef.current;
      if (canvas) {
        rendererRef.current.render(canvas, {
          gridSize: currentGridSize,
          terrain: terrainRef.current,
          owners: ownersRef.current,
          tanks: tanksRef.current,
          cities: citiesRef.current,
          deathStates: deathStatesRef.current,
          exhaustedTanks: exhaustedTanksRef.current,
          visibleTiles: visibleRef.current,
          exploredTiles: exploredRef.current,
          cameraX: camera.x,
          cameraY: camera.y,
          zoom,
          selectedTile,
          hoveredTile,
          hoverOdds,
          attackTarget: null,
          animationTick: animTickRef.current,
          showAllFog,
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [camera, zoom, selectedTile, hoveredTile, hoverOdds, showAllFog, currentGridSize]);

  // Resize canvas to window size
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const panSpeed = 48;
      const canvasW = canvasRef.current?.width || 800;
      const canvasH = canvasRef.current?.height || 600;
      const totalMapW = currentGridSize * zoom;
      const totalMapH = currentGridSize * zoom;
      const minX = totalMapW < canvasW ? (totalMapW - canvasW) / 2 : 0;
      const maxX = totalMapW < canvasW ? (totalMapW - canvasW) / 2 : totalMapW - canvasW;
      const minY = totalMapH < canvasH ? (totalMapH - canvasH) / 2 : 0;
      const maxY = totalMapH < canvasH ? (totalMapH - canvasH) / 2 : totalMapH - canvasH;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setCamera((prev) => ({ ...prev, y: Math.max(minY, prev.y - panSpeed) }));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setCamera((prev) => ({ ...prev, y: Math.min(maxY, prev.y + panSpeed) }));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setCamera((prev) => ({ ...prev, x: Math.max(minX, prev.x - panSpeed) }));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setCamera((prev) => ({ ...prev, x: Math.min(maxX, prev.x + panSpeed) }));
      } else if (e.key === 'h' || e.key === 'H') {
        handleJumpToCapital();
      } else if (e.key === 'Escape') {
        setSelectedTile(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, handleJumpToCapital, currentGridSize]);

  // Pointer Canvas interactions:
  // Right-click drag: Move/Pan the map
  // Right-click: Pick up tank into reserve inventory (unlimited reuse as long as not destroyed)
  // Left-click: Deploy tanks (on friendly tile) & Attack (on enemy/neutral land)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;

    if (e.button === 2) {
      isRightPanningRef.current = true;
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isRightPanningRef.current) {
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };

      if (Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y) > 4) {
        hasDraggedRef.current = true;
      }

      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const totalMapW = currentGridSize * zoom;
      const totalMapH = currentGridSize * zoom;
      const minX = totalMapW < canvasW ? (totalMapW - canvasW) / 2 : 0;
      const maxX = totalMapW < canvasW ? (totalMapW - canvasW) / 2 : totalMapW - canvasW;
      const minY = totalMapH < canvasH ? (totalMapH - canvasH) / 2 : 0;
      const maxY = totalMapH < canvasH ? (totalMapH - canvasH) / 2 : totalMapH - canvasH;

      setCamera((prev) => ({
        x: Math.max(minX, Math.min(maxX, prev.x - dx)),
        y: Math.max(minY, Math.min(maxY, prev.y - dy)),
      }));
    } else {
      // Hovered tile calculation
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const tileX = Math.floor((clickX + camera.x) / zoom);
      const tileY = Math.floor((clickY + camera.y) / zoom);

      if (tileX >= 0 && tileX < currentGridSize && tileY >= 0 && tileY < currentGridSize) {
        setHoveredTile({ x: tileX, y: tileY });

        // Check if hovered tile can be attacked (water is impassable and cannot be attacked)
        const hIdx = tileY * currentGridSize + tileX;
        const hOwner = ownersRef.current[hIdx] as PlayerId;
        const isWater = terrainRef.current[hIdx] === 2;

        if (hOwner !== 1 && !isWater && !isAiTurn) {
          const neighbors = getNeighbors8(tileX, tileY, currentGridSize);
          const human = players[1];
          const hasReserveTanks = human && human.tanksInReserve > 0;
          let canAttack = false;

          for (const n of neighbors) {
            if (ownersRef.current[n.index] === 1 && terrainRef.current[n.index] !== 2) {
              if (tanksRef.current[n.index] > 0 || hasReserveTanks) {
                canAttack = true;
                break;
              }
            }
          }

          if (canAttack) {
            const odds = calculateCombatOdds(
              tileX,
              tileY,
              1,
              {
                owners: ownersRef.current,
                tanks: tanksRef.current,
                cities: citiesRef.current,
                deathStates: deathStatesRef.current,
                terrain: terrainRef.current,
                failureCounts: failureCountsRef.current,
              },
              currentGridSize
            );
            setHoverOdds({
              x: tileX,
              y: tileY,
              chanceText: odds.finalPercentageText,
              chanceNum: odds.finalChance,
            });
          } else {
            setHoverOdds(null);
          }
        } else {
          setHoverOdds(null);
        }
      } else {
        setHoveredTile(null);
        setHoverOdds(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
    const wasDrag = hasDraggedRef.current || dist > 5;
    const button = e.button;

    if (button === 2) {
      // Right Click
      isRightPanningRef.current = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}

      if (!wasDrag) {
        // Stationary Right Click: Pick up tank on tile into reserves (unlimited reuse as long as not destroyed)
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const tileX = Math.floor((clickX + camera.x) / zoom);
        const tileY = Math.floor((clickY + camera.y) / zoom);

        if (tileX >= 0 && tileX < currentGridSize && tileY >= 0 && tileY < currentGridSize) {
          handleRightClick(tileX, tileY);
        }
      }
      return;
    }

    if (button === 0) {
      // Left Click: Deploy or Attack
      if (!wasDrag) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const tileX = Math.floor((clickX + camera.x) / zoom);
        const tileY = Math.floor((clickY + camera.y) / zoom);

        if (tileX >= 0 && tileX < currentGridSize && tileY >= 0 && tileY < currentGridSize) {
          handleLeftClick(tileX, tileY);
        }
      }
    }
  };

  // Right-Click Action: Pick up tank from friendly territory into reserve inventory
  // Rule: You can keep picking up and reusing tanks as much as you want, as long as they are not destroyed!
  const handleRightClick = (tx: number, ty: number) => {
    if (isAiTurn) return;
    const clickedIdx = ty * currentGridSize + tx;
    const clickedOwner = ownersRef.current[clickedIdx] as PlayerId;
    const currentTanks = tanksRef.current[clickedIdx];

    setSelectedTile({ x: tx, y: ty });

    if (clickedOwner === 1) {
      if (currentTanks > 0) {
        tanksRef.current[clickedIdx]--;
        setPlayers((prev) =>
          prev.map((p) => (p.id === 1 ? { ...p, tanksInReserve: p.tanksInReserve + 1 } : p))
        );
        retroAudio.playClick();
        addLog(`Picked up 1 tank from Sector (${tx}, ${ty}) into reserves.`, 'general', 1);
      } else {
        retroAudio.playClick();
      }
    } else {
      retroAudio.playClick();
    }
  };

  // Left-Click Action: Deploy (on owned land) & Attack (on unowned territory)
  // Water is impassable: tanks cannot enter water and water cannot be conquered!
  const handleLeftClick = (tx: number, ty: number) => {
    if (isAiTurn) return;
    const clickedIdx = ty * currentGridSize + tx;
    const clickedOwner = ownersRef.current[clickedIdx] as PlayerId;
    const isCity = citiesRef.current[clickedIdx] === 1;
    const isWater = terrainRef.current[clickedIdx] === 2;

    setSelectedTile({ x: tx, y: ty });

    // Impassable water check
    if (isWater) {
      retroAudio.playClick();
      addLog(`Sector (${tx}, ${ty}) is impassable deep water. Tanks cannot traverse water.`, 'general', 1);
      return;
    }

    if (clickedOwner === 1) {
      // Friendly square: DEPLOY
      if (isCity) {
        retroAudio.playClick();
        addLog(`Cities cannot hold tanks. Deploy tanks on surrounding open sectors.`, 'general', 1);
        return;
      }

      const human = players[1];
      if (human && human.tanksInReserve > 0) {
        tanksRef.current[clickedIdx]++;
        setPlayers((prev) =>
          prev.map((p) => (p.id === 1 ? { ...p, tanksInReserve: p.tanksInReserve - 1 } : p))
        );
        retroAudio.playDeploy();
        addLog(`Deployed 1 tank at Sector (${tx}, ${ty}).`, 'general', 1);
      } else {
        retroAudio.playClick();
        addLog(`No tanks in reserve. Right-click existing tanks to pick them up into reserves.`, 'general', 1);
      }
    } else {
      // Unowned square (neutral or enemy): ATTACK
      const neighbors = getNeighbors8(tx, ty, currentGridSize);
      let launchTile: { x: number; y: number } | null = null;
      let isDeployAttack = false;

      // 1. Check if previously selected tile is adjacent, friendly, not water, and has a tank
      if (
        selectedTile &&
        ownersRef.current[selectedTile.y * currentGridSize + selectedTile.x] === 1 &&
        terrainRef.current[selectedTile.y * currentGridSize + selectedTile.x] !== 2 &&
        tanksRef.current[selectedTile.y * currentGridSize + selectedTile.x] > 0
      ) {
        const dx = Math.abs(tx - selectedTile.x);
        const dy = Math.abs(ty - selectedTile.y);
        if (dx <= 1 && dy <= 1 && dx + dy > 0) {
          launchTile = { x: selectedTile.x, y: selectedTile.y };
          isDeployAttack = false;
        }
      }

      // 2. Check any adjacent friendly land tile with a ground tank
      if (!launchTile) {
        for (const n of neighbors) {
          if (
            ownersRef.current[n.index] === 1 &&
            terrainRef.current[n.index] !== 2 &&
            tanksRef.current[n.index] > 0
          ) {
            launchTile = { x: n.x, y: n.y };
            isDeployAttack = false;
            break;
          }
        }
      }

      // 3. As long as there are tanks in reserve, deploy directly to attack from friendly land frontier
      const human = players[1];
      if (!launchTile && human && human.tanksInReserve > 0) {
        for (const n of neighbors) {
          if (ownersRef.current[n.index] === 1 && terrainRef.current[n.index] !== 2) {
            launchTile = { x: n.x, y: n.y };
            isDeployAttack = true;
            break;
          }
        }
      }

      if (launchTile) {
        executeDirectAttack(tx, ty, launchTile, isDeployAttack);
      } else {
        retroAudio.playClick();
        addLog(`Cannot assault Sector (${tx}, ${ty}). Deploy a tank adjacent to this sector or pick up tanks into reserve.`, 'general', 1);
      }
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 2 : -2;
    const newZoom = Math.max(10, Math.min(32, zoom + zoomDelta));
    if (newZoom !== zoom) {
      setZoom(newZoom);
    }
  };

  // Direct 1-Click Attack Executor (Instant resolution with retry bonuses)
  // Rule: Attacking tanks are reusable as long as not destroyed!
  const executeDirectAttack = (
    tx: number,
    ty: number,
    launchTile: { x: number; y: number },
    isDeployAttack: boolean
  ) => {
    retroAudio.playCannonShot();
    const targetIdx = ty * currentGridSize + tx;
    const targetOwner = ownersRef.current[targetIdx] as PlayerId;
    const isTargetCity = citiesRef.current[targetIdx] === 1;
    const launchIdx = launchTile.y * currentGridSize + launchTile.x;

    const odds = calculateCombatOdds(
      tx,
      ty,
      1,
      {
        owners: ownersRef.current,
        tanks: tanksRef.current,
        cities: citiesRef.current,
        deathStates: deathStatesRef.current,
        terrain: terrainRef.current,
        failureCounts: failureCountsRef.current,
      },
      currentGridSize
    );

    const roll = Math.random() * 100;
    const isSuccess = roll <= odds.finalChance;

    if (isSuccess) {
      retroAudio.playVictoryHit();
      failureCountsRef.current.delete(targetIdx);

      // Claim territory ownership
      ownersRef.current[targetIdx] = 1;
      deathStatesRef.current[targetIdx] = 0;

      // Defending enemy tank destroyed
      if (tanksRef.current[targetIdx] > 0) {
        tanksRef.current[targetIdx] = 0;
      }

      if (isTargetCity) {
        retroAudio.playCityCaptured();
        setCityList((prev) =>
          prev.map((c) => (c.x === tx && c.y === ty ? { ...c, owner: 1 } : c))
        );
        tanksRef.current[targetIdx] = 0; // City never holds a tank

        if (isDeployAttack) {
          // Deployed tank stays stationed on launch tile and is ready for reuse
          tanksRef.current[launchIdx]++;
          setPlayers((prev) =>
            prev.map((p) => (p.id === 1 ? { ...p, tanksInReserve: p.tanksInReserve - 1 } : p))
          );
        }

        addLog(`★ CITY CAPTURED at Sector (${tx}, ${ty})! City provides +2 tanks/day and secures supply lines.`, 'capture', 1);
      } else {
        // Non-city territory: attacking tank advances and is ready for immediate reuse
        if (isDeployAttack) {
          tanksRef.current[targetIdx] = 1;
          setPlayers((prev) =>
            prev.map((p) => (p.id === 1 ? { ...p, tanksInReserve: p.tanksInReserve - 1 } : p))
          );
        } else {
          if (tanksRef.current[launchIdx] > 0) {
            tanksRef.current[launchIdx]--;
            tanksRef.current[targetIdx] = 1;
          }
        }
        addLog(`Assault Won (${odds.finalPercentageText})! Sector (${tx}, ${ty}) captured. Tank is ready to advance or be picked up.`, 'combat', 1);
      }

      // Update vision and counts
      updateHumanVisibility();
      updatePlayerCounts();

      if (targetOwner !== 0) {
        checkPlayerElimination(targetOwner);
      }

      setHoverOdds(null);
    } else {
      // Assault Failed!
      retroAudio.playAttackFailed();
      const currentFailures = failureCountsRef.current.get(targetIdx) || 0;
      failureCountsRef.current.set(targetIdx, currentFailures + 1);

      const nextOdds = calculateCombatOdds(
        tx,
        ty,
        1,
        {
          owners: ownersRef.current,
          tanks: tanksRef.current,
          cities: citiesRef.current,
          deathStates: deathStatesRef.current,
          terrain: terrainRef.current,
          failureCounts: failureCountsRef.current,
        },
        currentGridSize
      );

      // Update hover badge immediately to show new boosted retry odds
      setHoverOdds({
        x: tx,
        y: ty,
        chanceText: nextOdds.finalPercentageText,
        chanceNum: nextOdds.finalChance,
      });

      addLog(
        `Assault repelled at Sector (${tx}, ${ty}). Retry chance increased to ${nextOdds.finalPercentageText}! You can assault again immediately.`,
        'combat',
        1
      );
    }
  };

  // Deploy Tank from inventory to selected friendly square
  const handleDeployTank = () => {
    if (!selectedTile || isAiTurn) return;
    const idx = selectedTile.y * currentGridSize + selectedTile.x;
    if (ownersRef.current[idx] !== 1 || citiesRef.current[idx] === 1 || terrainRef.current[idx] === 2) return;

    const human = players[1];
    if (!human || human.tanksInReserve <= 0) return;

    tanksRef.current[idx]++;
    setPlayers((prev) =>
      prev.map((p) => (p.id === 1 ? { ...p, tanksInReserve: p.tanksInReserve - 1 } : p))
    );

    retroAudio.playDeploy();
    addLog(`Stationed 1 tank at Sector (${selectedTile.x}, ${selectedTile.y}).`, 'general', 1);
  };

  // Recall Tank from selected tile back into inventory
  const handleRecallTank = () => {
    if (!selectedTile || isAiTurn) return;
    const idx = selectedTile.y * currentGridSize + selectedTile.x;
    if (ownersRef.current[idx] !== 1 || tanksRef.current[idx] <= 0) return;

    tanksRef.current[idx]--;
    setPlayers((prev) =>
      prev.map((p) => (p.id === 1 ? { ...p, tanksInReserve: p.tanksInReserve + 1 } : p))
    );

    retroAudio.playClick();
    addLog(`Recalled 1 tank from Sector (${selectedTile.x}, ${selectedTile.y}) to reserve.`, 'general', 1);
  };

  // Auto pick up ALL friendly tanks across the map into reserve inventory
  const handlePickupAllTanks = () => {
    if (isAiTurn) return;
    const totalTiles = currentGridSize * currentGridSize;
    let count = 0;

    for (let i = 0; i < totalTiles; i++) {
      if (ownersRef.current[i] === 1 && tanksRef.current[i] > 0) {
        count += tanksRef.current[i];
        tanksRef.current[i] = 0;
      }
    }

    if (count > 0) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === 1 ? { ...p, tanksInReserve: p.tanksInReserve + count } : p))
      );
      retroAudio.playClick();
      addLog(`Auto-recalled all ${count} tank(s) from the field into reserves.`, 'general', 1);
    } else {
      retroAudio.playClick();
      addLog(`No tanks currently deployed on the field to recall.`, 'general', 1);
    }
  };

  // Initiate Attack from toolbar
  const handleInitiateAttack = () => {
    if (!selectedTile || isAiTurn) return;
    handleLeftClick(selectedTile.x, selectedTile.y);
  };

  // Check if player has 0 cities left (Elimination condition)
  const checkPlayerElimination = (pId: PlayerId) => {
    let citiesCount = 0;
    const totalTiles = currentGridSize * currentGridSize;
    for (let i = 0; i < totalTiles; i++) {
      if (ownersRef.current[i] === pId && citiesRef.current[i] === 1) {
        citiesCount++;
      }
    }

    if (citiesCount === 0) {
      addLog(`RIVAL DEFEATED! ${players[pId]?.name || `Player ${pId}`} lost all cities and is eliminated!`, 'elimination', pId);

      // Check human victory
      let remainingAi = 0;
      for (let p = 2; p <= 4; p++) {
        let aiCities = 0;
        for (let i = 0; i < totalTiles; i++) {
          if (ownersRef.current[i] === p && citiesRef.current[i] === 1) {
            aiCities++;
          }
        }
        if (aiCities > 0) remainingAi++;
      }

      if (remainingAi === 0) {
        setGameOver({ isOver: true, isVictory: true });
      }
    }
  };

  // Turn Sequence: Human Ends Turn, AI executes sequentially
  const handleEndTurn = async () => {
    if (isAiTurn) return;

    setIsAiTurn(true);
    setSelectedTile(null);

    // 1. Human ended turn: update supply connectivity across all factions (water does not connect)
    const { totalInverted: humanPostInverted } = updateAllSupplyStates(
      {
        owners: ownersRef.current,
        tanks: tanksRef.current,
        cities: citiesRef.current,
        deathStates: deathStatesRef.current,
        terrain: terrainRef.current,
      },
      currentGridSize
    );

    if (humanPostInverted > 0) {
      addLog(`Turn ended: Cut-off territory separated from cities is now inverted!`, 'supply', 1);
    }

    // AI Players: 2 (Red), 3 (Green), 4 (Gold)
    for (let aiId = 2; aiId <= 4; aiId++) {
      const pId = aiId as PlayerId;
      const aiPlayer = players[pId];

      if (!aiPlayer || aiPlayer.isEliminated || aiPlayer.citiesCount === 0) {
        continue;
      }

      setActivePlayerId(pId);
      setAiThinkingMessage(`${aiPlayer.name} planning operational advance...`);

      // Artificial short delay for realistic GBA turn flow
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 1. Auto-capture adjacent enemy/neutral tiles in inverted death state (water cannot be captured)
      const { autoCapturedTiles, destroyedTanks } = executeAdjacentDeathStateCaptures(
        pId,
        {
          owners: ownersRef.current,
          tanks: tanksRef.current,
          cities: citiesRef.current,
          deathStates: deathStatesRef.current,
          terrain: terrainRef.current,
        },
        currentGridSize
      );

      if (autoCapturedTiles.length > 0) {
        addLog(
          `${aiPlayer.name} auto-captured ${autoCapturedTiles.length} adjacent cut-off sector(s)!`,
          'supply',
          pId
        );
        for (const act of autoCapturedTiles) {
          if (act.isCity) {
            setCityList((prev) =>
              prev.map((c) => (c.x === act.x && c.y === act.y ? { ...c, owner: pId } : c))
            );
          }
        }
      }
      if (destroyedTanks.length > 0) {
        addLog(`${destroyedTanks.length} cut-off tank(s) destroyed outside ${aiPlayer.name} borders.`, 'supply', pId);
      }

      // 2. City tank generation (+2 tanks per city owned)
      let aiCityCount = 0;
      const totalTiles = currentGridSize * currentGridSize;
      for (let i = 0; i < totalTiles; i++) {
        if (ownersRef.current[i] === pId && citiesRef.current[i] === 1) {
          aiCityCount++;
        }
      }

      const newTanks = aiCityCount * 2;
      aiPlayer.tanksInReserve += newTanks;

      // 3. AI Tactics: Deploy tanks to frontier and launch attacks
      executeAiDecisions(pId, aiPlayer);

      // 4. Update supply lines and inverted states at the end of this AI's turn
      updateAllSupplyStates(
        {
          owners: ownersRef.current,
          tanks: tanksRef.current,
          cities: citiesRef.current,
          deathStates: deathStatesRef.current,
          terrain: terrainRef.current,
        },
        currentGridSize
      );
    }

    // Advance to next Day / Turn for Human
    const nextDay = turnDay + 1;
    setTurnDay(nextDay);
    setActivePlayerId(1);
    setIsAiTurn(false);
    setAiThinkingMessage('');

    // Human start of turn:
    // 1. Auto-capture adjacent enemy/neutral tiles in inverted death state (water cannot be captured)
    const { autoCapturedTiles: humanCaptures, destroyedTanks: humanTankDestructions } =
      executeAdjacentDeathStateCaptures(
        1,
        {
          owners: ownersRef.current,
          tanks: tanksRef.current,
          cities: citiesRef.current,
          deathStates: deathStatesRef.current,
          terrain: terrainRef.current,
        },
        currentGridSize
      );

    if (humanCaptures.length > 0) {
      retroAudio.playCityCaptured();
      for (const act of humanCaptures) {
        if (act.isCity) {
          setCityList((prev) =>
            prev.map((c) => (c.x === act.x && c.y === act.y ? { ...c, owner: 1 } : c))
          );
        }
      }
      addLog(`★ Blue Guard borders auto-captured ${humanCaptures.length} adjacent cut-off inverted sector(s)!`, 'capture', 1);
    }
    if (humanTankDestructions.length > 0) {
      retroAudio.playAttackFailed();
      addLog(`Severed supply lines destroyed ${humanTankDestructions.length} adjacent enemy tank(s) into vacant land!`, 'supply', 1);
    }

    // 2. City tank generation (+2 tanks per owned city)
    let humanCities = 0;
    const totalTiles = currentGridSize * currentGridSize;
    for (let i = 0; i < totalTiles; i++) {
      if (ownersRef.current[i] === 1 && citiesRef.current[i] === 1) {
        humanCities++;
      }
    }

    if (humanCities === 0) {
      // Defeat!
      setGameOver({ isOver: true, isVictory: false });
      return;
    }

    const humanNewTanks = humanCities * 2;
    setPlayers((prev) =>
      prev.map((p) => (p.id === 1 ? { ...p, tanksInReserve: p.tanksInReserve + humanNewTanks } : p))
    );

    // Alert if human has inverted cut-off sectors
    let humanCutoff = 0;
    for (let i = 0; i < totalTiles; i++) {
      if (ownersRef.current[i] === 1 && deathStatesRef.current[i] > 0) {
        humanCutoff++;
      }
    }

    if (humanCutoff > 0) {
      retroAudio.playSupplyAlert();
      addLog(
        `WARNING: ${humanCutoff} Blue Guard sector(s) are cut off and inverted! Reconnect to a city this turn to prevent auto-capture!`,
        'supply',
        1
      );
    }

    updateHumanVisibility();
    updatePlayerCounts();
    retroAudio.playTurnStart();
    addLog(`Dawn of Day ${nextDay}. +${humanNewTanks} tanks added to Blue Guard reserves.`, 'general', 1);
  };

  // AI strategic decision-maker
  // Uses dedicated AI Commander engine with 3 playstyles (Berserk, Balanced, Defensive),
  // Desperation Override when losing territory, Fog of War exploration, and Supply Line Severing tactics.
  const executeAiDecisions = (aiId: PlayerId, aiPlayer: PlayerInfo) => {
    let aiExp = aiExploredRef.current.get(aiId);
    if (!aiExp || aiExp.length !== currentGridSize * currentGridSize) {
      aiExp = new Uint8Array(currentGridSize * currentGridSize);
      aiExploredRef.current.set(aiId, aiExp);
    }

    const result = executeAiCommanderTurn(
      aiId,
      aiPlayer,
      {
        owners: ownersRef.current,
        tanks: tanksRef.current,
        cities: citiesRef.current,
        deathStates: deathStatesRef.current,
        terrain: terrainRef.current,
        failureCounts: failureCountsRef.current,
      },
      aiExp,
      currentGridSize,
      gameSettings,
      showAllFog,
      addLog
    );

    if (result.citiesCaptured.length > 0) {
      setCityList((prev) =>
        prev.map((c) => {
          const cap = result.citiesCaptured.find((it) => it.x === c.x && it.y === c.y);
          return cap ? { ...c, owner: aiId } : c;
        })
      );
    }
  };

  // Inspect selected tile info
  let selectedOwner: PlayerId = 0;
  let selectedTanks = 0;
  let selectedIsCity = false;
  let selectedTerrain = 0;
  let selectedDeathState = 0;
  let canDeploy = false;
  let canAttack = false;
  let canRecall = false;

  if (selectedTile) {
    const sIdx = selectedTile.y * currentGridSize + selectedTile.x;
    selectedOwner = ownersRef.current[sIdx] as PlayerId;
    selectedTanks = tanksRef.current[sIdx];
    selectedIsCity = citiesRef.current[sIdx] === 1;
    selectedTerrain = terrainRef.current[sIdx];
    selectedDeathState = deathStatesRef.current[sIdx];

    const human = players[1] || { tanksInReserve: 0 };
    const isWater = selectedTerrain === 2;
    canDeploy = selectedOwner === 1 && !selectedIsCity && !isWater && human.tanksInReserve > 0;
    // Unlimited tank pickup and reuse: can always recall if human owned with tanks!
    canRecall = selectedOwner === 1 && selectedTanks > 0;

    // Can attack if selected an enemy/neutral land tile (not water) that has an adjacent friendly tank or human has reserves
    if (selectedOwner !== 1 && !isWater) {
      const neighbors = getNeighbors8(selectedTile.x, selectedTile.y, currentGridSize);
      for (const n of neighbors) {
        if (
          ownersRef.current[n.index] === 1 &&
          terrainRef.current[n.index] !== 2 &&
          (tanksRef.current[n.index] > 0 || human.tanksInReserve > 0)
        ) {
          canAttack = true;
          break;
        }
      }
    }
  }

  // Count isolated human tiles and deployed tanks
  let humanIsolatedTiles = 0;
  let humanDeployedTanks = 0;
  const totalTiles = currentGridSize * currentGridSize;
  for (let i = 0; i < totalTiles; i++) {
    if (ownersRef.current[i] === 1) {
      if (deathStatesRef.current[i] > 0 && terrainRef.current[i] !== 2) {
        humanIsolatedTiles++;
      }
      if (tanksRef.current[i] > 0) {
        humanDeployedTanks += tanksRef.current[i];
      }
    }
  }

  const humanPlayer = players[1] || {
    id: 1,
    name: 'Blue Guard',
    faction: '1st Armored (Human)',
    color: '#2563EB',
    darkColor: '#1D4ED8',
    accentColor: '#60A5FA',
    isAi: false,
    tanksInReserve: 0,
    citiesCount: 1,
    territoryCount: 9,
    isEliminated: false,
    capitalX: 9,
    capitalY: 9,
  };

  // Fullscreen state listener to keep UI in sync with ESC key or browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 60);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!next && document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 60);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070a13] text-slate-100 select-none font-mono">
      {/* Minimalist Website Header */}
      {!isFullscreen && (
        <WebsitePortalHeader
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenNewGame={() => setIsStartMenuOpen(true)}
          onOpenWorkshop={() => setIsScenarioListOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
        />
      )}

      {/* Embedded Game Cabinet Viewport */}
      <div className={`flex-1 w-full min-h-0 flex flex-col overflow-hidden ${isFullscreen ? 'p-0' : 'p-0 sm:p-2 bg-[#070a13]'}`}>
        <div className={`flex-1 w-full min-h-0 flex flex-col bg-[#0b0f19] ${isFullscreen ? '' : 'sm:border-2 sm:border-slate-800 shadow-2xl'} relative overflow-hidden`}>
          {/* GBA Top Header Contract (No in-game fog changing button: configured on new game only) */}
          <GbaHeader
            turnDay={turnDay}
            activePlayerId={activePlayerId}
            players={players}
            humanPlayer={humanPlayer}
            isAiTurn={isAiTurn}
            aiThinkingMessage={aiThinkingMessage}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            onOpenRules={() => setIsRulesOpen(true)}
            isolatedTileCount={humanIsolatedTiles}
            onJumpToCapital={handleJumpToCapital}
            onOpenNewGame={() => setIsStartMenuOpen(true)}
            onOpenScenarioWorkshop={() => setIsScenarioListOpen(true)}
          />

          {/* Main Canvas Field View */}
          <main
            className="relative flex-1 w-full h-full overflow-hidden bg-[#0B0F19] cursor-grab active:cursor-grabbing"
            onContextMenu={(e) => e.preventDefault()}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 block w-full h-full"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
            />

            {/* Minimap Radar Dock (Top Right) */}
            <div className="absolute top-3 right-3 z-20">
              <Minimap
                gridSize={currentGridSize}
                owners={ownersRef.current}
                cities={cityList}
                deathStates={deathStatesRef.current}
                exploredTiles={exploredRef.current}
                showAllFog={showAllFog}
                cameraX={camera.x}
                cameraY={camera.y}
                zoom={zoom}
                viewportWidth={canvasRef.current?.width || 800}
                viewportHeight={canvasRef.current?.height || 600}
                players={players}
                onPanTo={(worldX, worldY) => {
                  setCamera({
                    x: worldX * zoom - (canvasRef.current?.width || 800) / 2,
                    y: worldY * zoom - (canvasRef.current?.height || 600) / 2,
                  });
                  setSelectedTile({ x: worldX, y: worldY });
                }}
              />
            </div>

            {/* Tactical Key Guide Prompt */}
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-2 text-[10px] text-slate-300 bg-black/75 px-3 py-1.5 border border-slate-700 shadow-md">
              <span className="text-amber-400 font-bold">R-Click Drag:</span>
              <span>Move Map</span>
              <span className="text-slate-600">·</span>
              <span className="text-sky-400 font-bold">R-Click:</span>
              <span>Pickup Tank</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-bold">L-Click:</span>
              <span>Deploy / Attack</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Wheel: Zoom</span>
            </div>
          </main>

          {/* Bottom Command Toolbar with Auto Pick Up All Tanks Button */}
          <ActionToolbar
            selectedTile={selectedTile}
            selectedOwner={selectedOwner}
            selectedTanks={selectedTanks}
            selectedIsCity={selectedIsCity}
            selectedTerrain={selectedTerrain}
            selectedDeathState={selectedDeathState}
            selectedIsExhausted={false}
            humanPlayer={humanPlayer}
            isAiTurn={isAiTurn}
            canDeploy={canDeploy}
            canAttack={canAttack}
            canRecall={canRecall}
            interactionMode={interactionMode}
            setInteractionMode={setInteractionMode}
            onDeployTank={handleDeployTank}
            onRecallTank={handleRecallTank}
            onPickupAllTanks={handlePickupAllTanks}
            deployedTanksCount={humanDeployedTanks}
            onInitiateAttack={handleInitiateAttack}
            onEndTurn={handleEndTurn}
            zoom={zoom}
            onZoomIn={() => setZoom((prev) => Math.min(32, prev + 4))}
            onZoomOut={() => setZoom((prev) => Math.max(10, prev - 4))}
            recentLogs={logs}
            hoverOdds={hoverOdds}
          />
        </div>
      </div>

      {/* Tank Wars Mission Setup & New Game Menu Screen */}
      {isStartMenuOpen && (
        <StartMenuModal
          currentSettings={gameSettings}
          isIngameModal={turnDay > 1 || cityList.length > 0}
          onClose={() => setIsStartMenuOpen(false)}
          onOpenScenarioWorkshop={() => {
            setIsStartMenuOpen(false);
            setIsScenarioListOpen(true);
          }}
          onStartGame={(newSettings) => {
            setIsStartMenuOpen(false);
            initGame(newSettings);
          }}
        />
      )}

      {/* Scenario Workshop (View, Play, Import, Export, Manage up to 10 Scenarios) */}
      {isScenarioListOpen && (
        <ScenarioListModal
          onPlayScenario={handlePlayCustomScenario}
          onEditScenario={(sc) => {
            setEditingScenario(sc);
            setIsScenarioListOpen(false);
            setIsScenarioBuilderOpen(true);
          }}
          onCreateNew={() => {
            setEditingScenario(null);
            setIsScenarioListOpen(false);
            setIsScenarioBuilderOpen(true);
          }}
          onClose={() => setIsScenarioListOpen(false)}
        />
      )}

      {/* Scenario Builder Mode (Freedom map size, paint water barriers, grass, forests, cities, tanks, factions) */}
      {isScenarioBuilderOpen && (
        <ScenarioBuilderModal
          initialScenario={editingScenario}
          onPlayScenario={handlePlayCustomScenario}
          onClose={() => {
            setIsScenarioBuilderOpen(false);
            setIsScenarioListOpen(true);
          }}
        />
      )}

      {/* Field Operations Manual */}
      {isRulesOpen && <RulesGuideModal onClose={() => setIsRulesOpen(false)} />}

      {/* Campaign End / Victory / Defeat Modal */}
      {gameOver && (
        <GameOverModal
          isVictory={gameOver.isVictory}
          turnDay={turnDay}
          citiesCount={humanPlayer.citiesCount}
          totalCities={cityList.length}
          territoryCount={humanPlayer.territoryCount}
          onRestart={() => initGame()}
          onOpenNewGame={() => setIsStartMenuOpen(true)}
        />
      )}
    </div>
  );
}
