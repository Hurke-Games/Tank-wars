/**
 * Exact combat calculations and odds computation according to specifications:
 * - Empty territory: Base 90%, 1 adj tank -> 75%, 2 adj tanks -> 60%, 3+ adj tanks -> 45%, adj city -> -10%
 * - City directly: Base 75%, 1 adj tank -> 60%, 2 adj tanks -> 45%, 3+ adj tanks -> 30%, adj city -> -10%
 * - Tank directly: Base 80%, 1 adj tank -> 65%, 2 adj tanks -> 50%, 3+ adj tanks -> 35%, adj city -> -10%
 * - Following attack retry bonus: last percentage * 1.05 per consecutive failure
 */

import { CombatOdds, GRID_SIZE, PlayerId } from '../types/game';

export interface GridStateRef {
  owners: Uint8Array;
  tanks: Uint8Array;
  cities: Uint8Array;
  deathStates?: Uint8Array;
  terrain?: Uint8Array;
  failureCounts: Map<number, number>; // tileIndex -> consecutive failures
}

/**
 * Get 8-directional neighbors of a tile
 */
export function getNeighbors8(x: number, y: number, gridSize: number = GRID_SIZE): { x: number; y: number; index: number }[] {
  const neighbors: { x: number; y: number; index: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
        neighbors.push({ x: nx, y: ny, index: ny * gridSize + nx });
      }
    }
  }
  return neighbors;
}

/**
 * Calculates the exact combat odds when attacker attacks target tile
 */
export function calculateCombatOdds(
  targetX: number,
  targetY: number,
  attackerId: PlayerId,
  grid: GridStateRef,
  gridSize: number = GRID_SIZE
): CombatOdds {
  const targetIndex = targetY * gridSize + targetX;
  const isWater = grid.terrain && grid.terrain[targetIndex] === 2;

  // Water is impassable: cannot be targeted or conquered
  if (isWater) {
    return {
      targetX,
      targetY,
      targetOwner: 0,
      isCity: false,
      hasTank: false,
      baseChance: 0,
      adjacentDefendingTanks: 0,
      tankPenaltyPercent: 0,
      hasAdjacentCity: false,
      cityPenaltyPercent: 0,
      consecutiveFailures: 0,
      multiplier: 1.0,
      finalChance: 0,
      finalPercentageText: '0% (Impassable Water)',
      explanation: ['Water is deep and impassable', 'Tanks cannot assault water bodies'],
    };
  }

  const targetOwner = grid.owners[targetIndex] as PlayerId;
  const targetTankCount = grid.tanks[targetIndex];
  const targetIsCity = grid.cities[targetIndex] === 1;
  const hasTank = targetTankCount > 0;
  const isInverted = Boolean(grid.deathStates && grid.deathStates[targetIndex] > 0);

  // If target is cut-off / inverted: guaranteed 100% victory to conquer
  if (isInverted) {
    const explanation = [
      'Target is cut-off inverted territory (Severed from city)',
      '100% Guaranteed Conquest Victory!',
    ];
    return {
      targetX,
      targetY,
      targetOwner,
      isCity: targetIsCity,
      hasTank,
      baseChance: 100,
      adjacentDefendingTanks: 0,
      tankPenaltyPercent: 0,
      hasAdjacentCity: false,
      cityPenaltyPercent: 0,
      consecutiveFailures: 0,
      multiplier: 1,
      finalChance: 100,
      finalPercentageText: '100%',
      explanation,
    };
  }

  const neighbors = getNeighbors8(targetX, targetY, gridSize);

  // Count defending tanks in adjacent 8 tiles.
  // Note: defending tanks belong to the target's owner/defender (not the attacker!)
  let adjacentDefendingTanks = 0;
  let hasAdjacentCity = false;

  for (const n of neighbors) {
    const nOwner = grid.owners[n.index] as PlayerId;
    const nTanks = grid.tanks[n.index];
    const nIsCity = grid.cities[n.index] === 1;

    // If target is neutral (0), neutral neighbors don't have tanks, but neutral cities defend
    // If target is owned by defender, any defender-owned adjacent tanks and cities count
    if (targetOwner !== 0) {
      if (nOwner === targetOwner && nTanks > 0) {
        adjacentDefendingTanks += nTanks;
      }
      if (nOwner === targetOwner && nIsCity) {
        hasAdjacentCity = true;
      }
    } else {
      // Neutral territory: if an adjacent city is neutral, it adds nearby city bonus
      if (nIsCity && nOwner === 0) {
        hasAdjacentCity = true;
      }
    }
  }

  let baseChance = 90;
  let penaltyForTanks = 0;
  const explanation: string[] = [];

  if (targetIsCity) {
    // Attacking a city directly:
    // Base 75%, 1 tank -> 60% (-15%), 2 tanks -> 45% (-30%), 3+ -> 30% (-45%)
    baseChance = 75;
    explanation.push('Target is a City (Base odds: 75%)');

    if (adjacentDefendingTanks === 1) {
      penaltyForTanks = 15;
      explanation.push('1 adjacent defending tank: -15%');
    } else if (adjacentDefendingTanks === 2) {
      penaltyForTanks = 30;
      explanation.push('2 adjacent defending tanks: -30%');
    } else if (adjacentDefendingTanks >= 3) {
      penaltyForTanks = 45;
      explanation.push(`${adjacentDefendingTanks} adjacent defending tanks: -45%`);
    }
  } else if (hasTank) {
    // Attacking a tank directly:
    // Base 80%, 1 adj tank -> 65% (-15%), 2 adj tanks -> 50% (-30%), 3+ -> 35% (-45%)
    baseChance = 80;
    explanation.push('Target has defending Tank directly (Base odds: 80%)');

    if (adjacentDefendingTanks === 1) {
      penaltyForTanks = 15;
      explanation.push('1 adjacent defending tank: -15%');
    } else if (adjacentDefendingTanks === 2) {
      penaltyForTanks = 30;
      explanation.push('2 adjacent defending tanks: -30%');
    } else if (adjacentDefendingTanks >= 3) {
      penaltyForTanks = 45;
      explanation.push(`${adjacentDefendingTanks} adjacent defending tanks: -45%`);
    }
  } else {
    // Attacking territory with no tank or city:
    // Base 90%, 1 adj tank -> 75% (-15%), 2 adj tanks -> 60% (-30%), 3+ -> 45% (-45%)
    baseChance = 90;
    explanation.push('Target is unfortified territory (Base odds: 90%)');

    if (adjacentDefendingTanks === 1) {
      penaltyForTanks = 15;
      explanation.push('1 adjacent defending tank: -15%');
    } else if (adjacentDefendingTanks === 2) {
      penaltyForTanks = 30;
      explanation.push('2 adjacent defending tanks: -30%');
    } else if (adjacentDefendingTanks >= 3) {
      penaltyForTanks = 45;
      explanation.push(`${adjacentDefendingTanks} adjacent defending tanks: -45%`);
    }
  }

  // City penalty: drops chances by an additional 10%
  let cityPenalty = 0;
  if (hasAdjacentCity) {
    cityPenalty = 10;
    explanation.push('Defending city adjacent/nearby: -10%');
  }

  const initialCalculated = Math.max(5, baseChance - penaltyForTanks - cityPenalty);

  // Failure retry multiplier:
  // "if they fail their odds of success on a following attack will be their last percentage times 1.05."
  const consecutiveFailures = grid.failureCounts.get(targetIndex) || 0;
  const failureMultiplier = Math.pow(1.05, consecutiveFailures);

  if (consecutiveFailures > 0) {
    explanation.push(`${consecutiveFailures} prior failed attempt(s): ×${failureMultiplier.toFixed(3)} bonus`);
  }

  // Final capped percentage
  const finalChance = Math.min(99.0, Math.round(initialCalculated * failureMultiplier * 10) / 10);

  return {
    targetX,
    targetY,
    targetOwner,
    isCity: targetIsCity,
    hasTank,
    baseChance,
    adjacentDefendingTanks,
    tankPenaltyPercent: penaltyForTanks,
    hasAdjacentCity,
    cityPenaltyPercent: cityPenalty,
    consecutiveFailures,
    multiplier: failureMultiplier,
    finalChance,
    finalPercentageText: `${finalChance.toFixed(1)}%`,
    explanation,
  };
}
