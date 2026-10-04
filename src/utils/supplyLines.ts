/**
 * Supply lines and Inverted Death State calculations
 *
 * Rules:
 * - Cities keep the land controlled.
 * - If a section of tanks or land is disconnected from their own color (including neutral grey),
 *   they turn inverted in color after a player ends their turn (not during).
 * - If attacked while inverted, they have 100% success to conquer.
 * - At the beginning of a player's turn:
 *   - Any adjacent inverted vacant land touching the player's territory is auto-captured.
 *   - Any adjacent inverted tile with a tank has its tank destroyed, turning into vacant land
 *     (which can then be auto-captured on the subsequent turn).
 */

import { GRID_SIZE, PlayerId } from '../types/game';
import { getNeighbors8 } from './combat';

export interface SupplyGridRef {
  owners: Uint8Array;
  tanks: Uint8Array;
  cities: Uint8Array;
  deathStates: Uint8Array; // 0: connected/healthy, 1: disconnected/inverted
  terrain?: Uint8Array;    // 0: plain, 1: forest, 2: water
}

/**
 * Recomputes supply connectivity for all players (including Neutral 0).
 * Run only after a player ends their turn, not mid-turn.
 * Water is impassable and does NOT connect tiles for supply lines.
 */
export function updateAllSupplyStates(
  grid: SupplyGridRef,
  gridSize: number = GRID_SIZE
): {
  totalInverted: number;
  playerInvertedCounts: Record<PlayerId, number>;
} {
  const totalTiles = gridSize * gridSize;
  const visited = new Uint8Array(totalTiles);
  const playerInvertedCounts: Record<PlayerId, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

  // Evaluate each faction (0 = Neutral, 1 = Human, 2..4 = AI)
  for (let p = 0; p <= 4; p++) {
    const playerId = p as PlayerId;
    const queue: number[] = [];
    let cityCount = 0;

    // Seed BFS with all cities owned by this player (cities can never be on water)
    for (let i = 0; i < totalTiles; i++) {
      if (grid.owners[i] === playerId && grid.cities[i] === 1) {
        visited[i] = 1;
        queue.push(i);
        cityCount++;
      }
    }

    // Flood fill through unbroken friendly land territory
    if (cityCount > 0) {
      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        const cx = curr % gridSize;
        const cy = Math.floor(curr / gridSize);

        const neighbors = getNeighbors8(cx, cy, gridSize);
        for (const n of neighbors) {
          // Water does not connect tiles!
          const isWater = grid.terrain && grid.terrain[n.index] === 2;
          if (!isWater && grid.owners[n.index] === playerId && visited[n.index] === 0) {
            visited[n.index] = 1;
            queue.push(n.index);
          }
        }
      }
    }

    // Update deathStates for all tiles of this player
    for (let i = 0; i < totalTiles; i++) {
      const isWater = grid.terrain && grid.terrain[i] === 2;
      if (isWater) {
        grid.deathStates[i] = 0; // Water never inverts
        continue;
      }

      if (grid.owners[i] === playerId) {
        if (visited[i] === 1) {
          grid.deathStates[i] = 0; // Connected to friendly city
        } else {
          // Disconnected from all friendly cities -> Inverted!
          grid.deathStates[i] = 1;
          playerInvertedCounts[playerId]++;
        }
      }
    }
  }

  let totalInverted = 0;
  for (let i = 0; i < totalTiles; i++) {
    if (grid.deathStates[i] > 0) totalInverted++;
  }

  return { totalInverted, playerInvertedCounts };
}

/**
 * Legacy wrapper: update supply state for a specific player (or all)
 */
export function updatePlayerSupplyState(
  playerId: PlayerId,
  grid: SupplyGridRef,
  gridSize: number = GRID_SIZE
): { isolatedCount: number; reconnectedCount: number } {
  const { playerInvertedCounts } = updateAllSupplyStates(grid, gridSize);
  return {
    isolatedCount: playerInvertedCounts[playerId] || 0,
    reconnectedCount: 0,
  };
}

/**
 * Evaluates how many enemy tiles, tanks, and cities would be cut off from their supply lines
 * if targetIdx is captured from targetOwner.
 */
export function evaluateSupplyCutPotential(
  targetIdx: number,
  targetOwner: PlayerId,
  grid: SupplyGridRef,
  gridSize: number = GRID_SIZE
): { cutTiles: number; cutTanks: number; cutCities: number } {
  if (targetOwner === 0) return { cutTiles: 0, cutTanks: 0, cutCities: 0 };
  const totalTiles = gridSize * gridSize;

  // Find remaining targetOwner cities (excluding targetIdx if it was a city)
  const queue: number[] = [];
  const visited = new Uint8Array(totalTiles);
  let cityCount = 0;

  for (let i = 0; i < totalTiles; i++) {
    if (i !== targetIdx && grid.owners[i] === targetOwner && grid.cities[i] === 1) {
      visited[i] = 1;
      queue.push(i);
      cityCount++;
    }
  }

  // If no friendly cities remain for targetOwner, all their other tiles will become cut off!
  if (cityCount === 0) {
    let cutTiles = 0;
    let cutTanks = 0;
    for (let i = 0; i < totalTiles; i++) {
      if (i !== targetIdx && grid.owners[i] === targetOwner) {
        cutTiles++;
        if (grid.tanks[i] > 0) cutTanks += grid.tanks[i];
      }
    }
    return { cutTiles, cutTanks, cutCities: 0 };
  }

  // BFS flood fill from remaining cities through uninterrupted friendly land
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % gridSize;
    const cy = Math.floor(curr / gridSize);
    const neighbors = getNeighbors8(cx, cy, gridSize);

    for (const n of neighbors) {
      const isWater = grid.terrain && grid.terrain[n.index] === 2;
      if (
        !isWater &&
        n.index !== targetIdx &&
        grid.owners[n.index] === targetOwner &&
        visited[n.index] === 0
      ) {
        visited[n.index] = 1;
        queue.push(n.index);
      }
    }
  }

  // Count currently healthy tiles (deathStates === 0) that become cut off
  let cutTiles = 0;
  let cutTanks = 0;
  let cutCities = 0;

  for (let i = 0; i < totalTiles; i++) {
    if (i !== targetIdx && grid.owners[i] === targetOwner && grid.deathStates[i] === 0) {
      if (visited[i] === 0) {
        cutTiles++;
        if (grid.tanks[i] > 0) cutTanks += grid.tanks[i];
        if (grid.cities[i] === 1) cutCities++;
      }
    }
  }

  return { cutTiles, cutTanks, cutCities };
}

/**
 * At the beginning of activePlayerId's turn:
 * Checks adjacent enemy/neutral tiles that are in inverted death state touching activePlayerId's territory.
 * - If adjacent inverted tile is vacant land: auto taken over by active player!
 * - If adjacent inverted tile has a tank: tank dies and turns into vacant land (captured next turn).
 */
export function executeAdjacentDeathStateCaptures(
  activePlayerId: PlayerId,
  grid: SupplyGridRef,
  gridSize: number = GRID_SIZE
): {
  autoCapturedTiles: { x: number; y: number; prevOwner: PlayerId; isCity: boolean }[];
  destroyedTanks: { x: number; y: number; owner: PlayerId }[];
} {
  if (activePlayerId === 0) {
    return { autoCapturedTiles: [], destroyedTanks: [] };
  }

  const totalTiles = gridSize * gridSize;
  const autoCapturedTiles: { x: number; y: number; prevOwner: PlayerId; isCity: boolean }[] = [];
  const destroyedTanks: { x: number; y: number; owner: PlayerId }[] = [];

  // Snapshot the active player's initial territory at start of turn
  // so auto-captures on this turn only apply to tiles touching existing territory
  const initialPlayerTiles: number[] = [];
  for (let i = 0; i < totalTiles; i++) {
    if (grid.owners[i] === activePlayerId) {
      initialPlayerTiles.push(i);
    }
  }

  const processedEnemyTiles = new Set<number>();

  for (const i of initialPlayerTiles) {
    // Water tiles are impassable and do not connect
    if (grid.terrain && grid.terrain[i] === 2) continue;

    const cx = i % gridSize;
    const cy = Math.floor(i / gridSize);
    const neighbors = getNeighbors8(cx, cy, gridSize);

    for (const n of neighbors) {
      if (grid.terrain && grid.terrain[n.index] === 2) continue; // Water cannot be captured

      const neighborOwner = grid.owners[n.index] as PlayerId;
      const isInverted = grid.deathStates[n.index] > 0;

      // Inverted tile belonging to ANY other faction (including neutral grey 0)
      if (
        neighborOwner !== activePlayerId &&
        isInverted &&
        !processedEnemyTiles.has(n.index)
      ) {
        processedEnemyTiles.add(n.index);
        const hasTank = grid.tanks[n.index] > 0;

        if (hasTank) {
          // "If it is a tank and it will turn into vacant land."
          grid.tanks[n.index] = 0;
          // Remains inverted vacant land; on the following turn it will be auto-captured
          destroyedTanks.push({ x: n.x, y: n.y, owner: neighborOwner });
        } else {
          // "If it is an adjacent land it will be auto taken over by a player at the begining of their turn."
          const isCity = grid.cities[n.index] === 1;
          grid.owners[n.index] = activePlayerId;
          grid.deathStates[n.index] = 0; // Claimed and reconnected to active player
          autoCapturedTiles.push({ x: n.x, y: n.y, prevOwner: neighborOwner, isCity });
        }
      }
    }
  }

  return { autoCapturedTiles, destroyedTanks };
}
