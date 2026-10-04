/**
 * Custom Scenario Storage, Import, and Export Manager
 *
 * Supports:
 * - Up to 10 stored custom scenarios in localStorage
 * - JSON import & export (.tankwar.json) for sharing
 * - Starter scenarios for immediate play & inspiration
 */

import { CustomScenario, AiPlaystyle } from '../types/game';

const STORAGE_KEY = 'tankwars_custom_scenarios_v1';
export const MAX_CUSTOM_SCENARIOS = 10;

/**
 * Generate a pre-built scenario for initial demonstration
 */
function createDefaultScenario1(): CustomScenario {
  const size = 30;
  const total = size * size;
  const terrain = new Array(total).fill(0); // plains
  const owners = new Array(total).fill(0);  // neutral
  const tanks = new Array(total).fill(0);
  const cities = new Array(total).fill(0);

  // Create a winding river across the middle (water barrier)
  for (let y = 0; y < size; y++) {
    const rx = Math.floor(size / 2) + Math.round(Math.sin(y * 0.4) * 3);
    for (let w = -1; w <= 1; w++) {
      const tx = rx + w;
      if (tx >= 0 && tx < size) {
        terrain[y * size + tx] = 2; // water
      }
    }
  }

  // Choke-point Land Bridges across the river
  const bridgeYs = [6, 15, 23];
  for (const by of bridgeYs) {
    for (let x = 0; x < size; x++) {
      if (Math.abs(x - size / 2) <= 5) {
        terrain[by * size + x] = 0; // land bridge
      }
    }
  }

  // Scattered forests
  for (let i = 0; i < total; i++) {
    if (terrain[i] === 0 && Math.random() < 0.18) {
      terrain[i] = 1; // forest
    }
  }

  // Player 1 (Blue Guard) on the West bank
  const p1CapX = 5;
  const p1CapY = 15;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const idx = (p1CapY + dy) * size + (p1CapX + dx);
      owners[idx] = 1;
      terrain[idx] = 0;
    }
  }
  cities[p1CapY * size + p1CapX] = 1;
  tanks[(p1CapY - 1) * size + p1CapX] = 1;
  tanks[(p1CapY + 1) * size + p1CapX] = 1;
  tanks[p1CapY * size + (p1CapX + 1)] = 1;

  // Player 2 (Red Legion) on the East bank
  const p2CapX = 24;
  const p2CapY = 15;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const idx = (p2CapY + dy) * size + (p2CapX + dx);
      owners[idx] = 2;
      terrain[idx] = 0;
    }
  }
  cities[p2CapY * size + p2CapX] = 1;
  tanks[(p2CapY - 1) * size + p2CapX] = 1;
  tanks[(p2CapY + 1) * size + p2CapX] = 1;
  tanks[p2CapY * size + (p2CapX - 1)] = 1;

  // Key neutral strategic cities guarding the bridges
  cities[6 * size + Math.floor(size / 2)] = 1;
  terrain[6 * size + Math.floor(size / 2)] = 0;
  cities[15 * size + Math.floor(size / 2)] = 1;
  terrain[15 * size + Math.floor(size / 2)] = 0;
  cities[23 * size + Math.floor(size / 2)] = 1;
  terrain[23 * size + Math.floor(size / 2)] = 0;

  // Secondary neutral cities
  cities[4 * size + 8] = 1;
  cities[25 * size + 8] = 1;
  cities[4 * size + 21] = 1;
  cities[25 * size + 21] = 1;

  return {
    id: 'starter_river_choke',
    name: 'River Delta Chokepoint',
    description: 'A deep impassable river splits the battlefield. Fight for the 3 fortified land bridges.',
    createdAt: Date.now() - 100000,
    gridSize: size,
    numAiPlayers: 1,
    fogOfWar: true,
    aiPlaystyles: { 2: 'berserk' },
    terrain,
    owners,
    tanks,
    cities,
    capitals: {
      1: { x: p1CapX, y: p1CapY },
      2: { x: p2CapX, y: p2CapY },
    },
  };
}

function createDefaultScenario2(): CustomScenario {
  const size = 35;
  const total = size * size;
  const terrain = new Array(total).fill(0);
  const owners = new Array(total).fill(0);
  const tanks = new Array(total).fill(0);
  const cities = new Array(total).fill(0);

  // Outer water moat with mountain forests
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
        terrain[y * size + x] = 2; // perimeter water
      }
    }
  }

  // Cross-shaped central canal
  const mid = Math.floor(size / 2);
  for (let i = 4; i < size - 4; i++) {
    if (Math.abs(i - mid) > 2) {
      terrain[mid * size + i] = 2;
      terrain[i * size + mid] = 2;
    }
  }

  // Four Capitals in four quadrants
  const coords = [
    { p: 1, x: 5, y: 5 },
    { p: 2, x: 29, y: 5 },
    { p: 3, x: 5, y: 29 },
    { p: 4, x: 29, y: 29 },
  ];

  const capitals: Record<number, { x: number; y: number }> = {};

  coords.forEach(({ p, x, y }) => {
    capitals[p] = { x, y };
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const idx = (y + dy) * size + (x + dx);
        owners[idx] = p;
        terrain[idx] = 0;
      }
    }
    cities[y * size + x] = 1;
    tanks[(y - 1) * size + x] = 1;
    tanks[(y + 1) * size + x] = 1;
    tanks[y * size + (x + 1)] = 1;
  });

  // Center Fortress Island (Grand Prize)
  cities[mid * size + mid] = 1;
  terrain[mid * size + mid] = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      terrain[(mid + dy) * size + (mid + dx)] = 0;
    }
  }

  return {
    id: 'starter_four_corners',
    name: 'Four Corners Citadel',
    description: '4-player continental siege with water-divided quadrants racing for the Central Citadel.',
    createdAt: Date.now() - 50000,
    gridSize: size,
    numAiPlayers: 3,
    fogOfWar: false,
    aiPlaystyles: { 2: 'berserk', 3: 'balanced', 4: 'defensive' },
    terrain,
    owners,
    tanks,
    cities,
    capitals,
  };
}

/**
 * Retrieve all saved scenarios from localStorage (or seed defaults)
 */
export function getSavedScenarios(): CustomScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load custom scenarios from localStorage:', err);
  }

  // Seed with default scenarios if empty
  const defaults = [createDefaultScenario1(), createDefaultScenario2()];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {}
  return defaults;
}

/**
 * Save scenario to localStorage (enforces 10-slot limit)
 */
export function saveScenario(scenario: CustomScenario): { success: boolean; error?: string } {
  try {
    const scenarios = getSavedScenarios();
    const existingIndex = scenarios.findIndex((s) => s.id === scenario.id);

    if (existingIndex >= 0) {
      // Update existing
      scenarios[existingIndex] = {
        ...scenario,
        createdAt: Date.now(),
      };
    } else {
      // Add new
      if (scenarios.length >= MAX_CUSTOM_SCENARIOS) {
        return {
          success: false,
          error: `Storage capacity reached (${MAX_CUSTOM_SCENARIOS} scenarios maximum). Please delete an existing scenario first.`,
        };
      }
      scenarios.unshift({
        ...scenario,
        id: scenario.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now(),
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown storage error',
    };
  }
}

/**
 * Delete a scenario from localStorage by ID
 */
export function deleteScenario(id: string): boolean {
  try {
    const scenarios = getSavedScenarios().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    return true;
  } catch (err) {
    console.error('Failed to delete scenario:', err);
    return false;
  }
}

/**
 * Export a scenario to a downloadable .tankwar.json file
 */
export function exportScenarioToJson(scenario: CustomScenario): void {
  const filename = `${scenario.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'custom_map'}.tankwar.json`;
  const data = JSON.stringify(scenario, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an imported JSON file into a valid CustomScenario
 */
export function validateAndParseScenario(rawText: string): CustomScenario {
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON format: The selected file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file structure: Expected a scenario object.');
  }

  const gridSize = Number(parsed.gridSize);
  if (!gridSize || gridSize < 15 || gridSize > 100) {
    throw new Error(`Invalid map size: Grid dimension must be between 15 and 100 (got ${gridSize}).`);
  }

  const total = gridSize * gridSize;

  if (!Array.isArray(parsed.terrain) || parsed.terrain.length !== total) {
    throw new Error(`Invalid terrain data: expected array of ${total} elements (got ${parsed.terrain?.length || 0}).`);
  }

  if (!Array.isArray(parsed.owners) || parsed.owners.length !== total) {
    throw new Error(`Invalid owners data: expected array of ${total} elements.`);
  }

  if (!Array.isArray(parsed.tanks) || parsed.tanks.length !== total) {
    throw new Error(`Invalid tanks data: expected array of ${total} elements.`);
  }

  if (!Array.isArray(parsed.cities) || parsed.cities.length !== total) {
    throw new Error(`Invalid cities data: expected array of ${total} elements.`);
  }

  // Validate number of AI players
  const numAiPlayers = Math.max(1, Math.min(3, Number(parsed.numAiPlayers) || 1));
  const fogOfWar = Boolean(parsed.fogOfWar);

  // Validate terrain values (0, 1, 2)
  const terrain = parsed.terrain.map((v: any) => {
    const n = Number(v);
    return n >= 0 && n <= 2 ? n : 0;
  });

  // Validate owners (0..4)
  const owners = parsed.owners.map((v: any) => {
    const n = Number(v);
    return n >= 0 && n <= 4 ? n : 0;
  });

  // Validate tanks
  const tanks = parsed.tanks.map((v: any) => Math.max(0, Math.min(99, Number(v) || 0)));

  // Validate cities (0 or 1, and cities cannot be on water!)
  const cities = parsed.cities.map((v: any, idx: number) => {
    const c = Number(v) === 1 ? 1 : 0;
    if (c === 1 && terrain[idx] === 2) return 0; // enforce no cities on water
    return c;
  });

  // Ensure human player has at least one city or territory
  let hasHumanPresence = false;
  for (let i = 0; i < total; i++) {
    if (owners[i] === 1) {
      hasHumanPresence = true;
      break;
    }
  }

  if (!hasHumanPresence) {
    // If no human presence specified, assign tile (2, 2) to human
    const fallbackIdx = 2 * gridSize + 2;
    owners[fallbackIdx] = 1;
    terrain[fallbackIdx] = 0;
    cities[fallbackIdx] = 1;
  }

  return {
    id: `imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Imported Scenario',
    description: typeof parsed.description === 'string' ? parsed.description : undefined,
    createdAt: Date.now(),
    gridSize,
    numAiPlayers,
    fogOfWar,
    aiPlaystyles: parsed.aiPlaystyles || { 2: 'berserk', 3: 'balanced', 4: 'defensive' },
    terrain,
    owners,
    tanks,
    cities,
    capitals: parsed.capitals,
  };
}
