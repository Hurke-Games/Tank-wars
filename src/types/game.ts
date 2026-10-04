/**
 * Game types and state definitions for Tank Wars
 */

export let GRID_SIZE = 50;
export function setGlobalGridSize(val: number) {
  GRID_SIZE = val;
}

export const DEFAULT_GRID_SIZE = 50;
export const DEFAULT_TOTAL_CITIES = 50;

export type AiPlaystyle = 'berserk' | 'balanced' | 'defensive';

export interface GameSettings {
  gridSize: number;       // 20 to 100
  numAiPlayers: number;   // 1, 2, or 3
  totalCities: number;    // 10 to 100
  fogOfWar: boolean;      // true: fog of war, false: all visible + AI knows cities
  aiPlaystyles?: Record<number, AiPlaystyle>; // AI rival ID (2: Red, 3: Green, 4: Gold) -> playstyle
}

export const TOTAL_CITIES = 50;

export type PlayerId = 0 | 1 | 2 | 3 | 4;
// 0: Neutral (Grey)
// 1: Player 1 (Blue Guard - Human)
// 2: Player 2 (Red Legion - AI)
// 3: Player 3 (Green Fleet - AI)
// 4: Player 4 (Gold Dominion - AI)

export type TerrainType = 'plain' | 'forest' | 'water';

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  faction: string;
  color: string;
  darkColor: string;
  accentColor: string;
  isAi: boolean;
  playstyle?: AiPlaystyle;
  peakTerritory?: number;
  peakCities?: number;
  isDesperate?: boolean;
  tanksInReserve: number;
  citiesCount: number;
  territoryCount: number;
  isEliminated: boolean;
  capitalX: number;
  capitalY: number;
}

export interface City {
  id: number;
  x: number;
  y: number;
  name: string;
  owner: PlayerId;
  isCapital: boolean;
}

export interface CombatOdds {
  targetX: number;
  targetY: number;
  targetOwner: PlayerId;
  isCity: boolean;
  hasTank: boolean;
  baseChance: number;
  adjacentDefendingTanks: number;
  tankPenaltyPercent: number;
  hasAdjacentCity: boolean;
  cityPenaltyPercent: number;
  consecutiveFailures: number;
  multiplier: number;
  finalChance: number;
  finalPercentageText: string;
  explanation: string[];
}

export type InteractionMode = 'inspect' | 'deploy' | 'attack';

export interface GameLog {
  id: string;
  turn: number;
  playerId: PlayerId;
  text: string;
  type: 'combat' | 'capture' | 'supply' | 'general' | 'elimination';
  timestamp: number;
}

export interface CustomScenario {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  gridSize: number;
  numAiPlayers: number;
  fogOfWar: boolean;
  aiPlaystyles?: Record<number, AiPlaystyle>;
  terrain: number[]; // 0: plain, 1: forest, 2: water
  owners: number[];  // 0: neutral, 1: human, 2: red, 3: green, 4: gold
  tanks: number[];   // tank count per tile
  cities: number[];  // 0: none, 1: city
  capitals?: Record<number, { x: number; y: number }>;
  cityNames?: Record<number, string>;
}
