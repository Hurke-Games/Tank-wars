/**
 * AI Commander Strategic Decision Engine
 *
 * Implements:
 * 1. Three distinct AI playstyles:
 *    - 'berserk': Explores actively, uses 100% of tanks (0% reserve), high aggression against rival players.
 *    - 'balanced': Keeps ~30% in reserve to protect cities, directs ~80% of attacks at rival players when found.
 *    - 'defensive': Keeps ~60% in reserve to protect cities, splits attacks 50/50 between players and neutral expansion.
 * 2. Desperation Override:
 *    - If losing territory or cities, commanders lower their reserves to 0% and use pure expected-value math
 *      to turn the tide and reclaim the map.
 * 3. Fog of War Intelligence:
 *    - If Fog is ON: AI has fog just like human player! It searches for cities by opening up the map,
 *      actively targeting sectors that reveal the maximum number of unexplored fog tiles.
 *    - If Fog is OFF: AI knows where all cities are immediately and targets them directly.
 * 4. Supply Line Severing:
 *    - Recognizes other players as the real threat and actively cuts off their supply lines (severing connection
 *      to their territory/cities to invert their units and hold them off).
 * 5. Water is impassable: never targets water.
 */

import { PlayerId, AiPlaystyle, PlayerInfo, GameSettings } from '../types/game';
import { calculateCombatOdds, getNeighbors8, GridStateRef } from './combat';
import { SupplyGridRef, evaluateSupplyCutPotential } from './supplyLines';

export interface AiTurnResult {
  attacksLaunched: number;
  attacksWon: number;
  citiesCaptured: { x: number; y: number }[];
  supplyCutsMade: number;
  exploredTilesCount: number;
  desperationActivated: boolean;
}

export const executeAiCommanderTurn = runAiTurn;


/**
 * Execute tactical decisions for an AI player
 */
export function runAiTurn(
  aiId: PlayerId,
  aiPlayer: PlayerInfo,
  grid: {
    owners: Uint8Array;
    tanks: Uint8Array;
    cities: Uint8Array;
    deathStates: Uint8Array;
    terrain: Uint8Array;
    failureCounts: Map<number, number>;
  },
  aiExplored: Uint8Array,
  gridSize: number,
  settings: GameSettings,
  showAllFog: boolean,
  onLog?: (text: string, type: 'combat' | 'capture' | 'supply' | 'general' | 'elimination', pId: PlayerId) => void
): AiTurnResult {
  const { owners, tanks, cities, deathStates, terrain, failureCounts } = grid;
  const totalTiles = gridSize * gridSize;
  const isFogDisabled = showAllFog || !settings.fogOfWar;
  const playstyle: AiPlaystyle = aiPlayer.playstyle || 'balanced';

  // 1. Check for Desperation Override
  // Triggered if territory has dropped by > 15% from its peak, or lost a city, or enemy is right at the gates
  const peakTerr = aiPlayer.peakTerritory || aiPlayer.territoryCount || 9;
  const peakCities = aiPlayer.peakCities || aiPlayer.citiesCount || 1;
  const currentTerr = aiPlayer.territoryCount;
  const currentCities = aiPlayer.citiesCount;

  const isLosingTerritory = peakTerr > 12 && currentTerr < peakTerr * 0.85;
  const hasLostCities = peakCities > 1 && currentCities < peakCities;
  const isDesperate = isLosingTerritory || hasLostCities;

  if (isDesperate && !aiPlayer.isDesperate) {
    aiPlayer.isDesperate = true;
    onLog?.(
      `⚠ ${aiPlayer.name} activated DESPERATION OVERRIDE! Releasing all tactical reserves to turn the tide!`,
      'general',
      aiId
    );
  }

  // 2. Update AI's own fog-of-war vision
  if (isFogDisabled) {
    aiExplored.fill(1);
  } else {
    for (let i = 0; i < totalTiles; i++) {
      if (owners[i] === aiId) {
        aiExplored[i] = 1;
        const cx = i % gridSize;
        const cy = Math.floor(i / gridSize);
        const neighbors = getNeighbors8(cx, cy, gridSize);
        for (const n of neighbors) {
          aiExplored[n.index] = 1;
        }
      }
    }
  }

  // 3. Find AI's owned cities and land frontier tiles (excluding impassable water)
  const ownedCityIndices: number[] = [];
  const frontierTiles: number[] = [];

  for (let i = 0; i < totalTiles; i++) {
    if (owners[i] === aiId && terrain[i] !== 2) {
      if (cities[i] === 1) {
        ownedCityIndices.push(i);
      }
      const cx = i % gridSize;
      const cy = Math.floor(i / gridSize);
      const neighbors = getNeighbors8(cx, cy, gridSize);
      for (const n of neighbors) {
        if (owners[n.index] !== aiId && terrain[n.index] !== 2) {
          frontierTiles.push(i);
          break;
        }
      }
    }
  }

  // 4. Reserve allocation based on playstyle & desperation:
  // - Berserk: 0% reserve (all tanks deployed)
  // - Balanced: 30% reserve kept to protect cities (stationed around cities)
  // - Defensive: 60% reserve kept to protect cities (stationed around cities)
  // - Desperate: 0% reserve override!
  let reserveFraction = 0;
  if (!isDesperate) {
    if (playstyle === 'berserk') reserveFraction = 0;
    else if (playstyle === 'balanced') reserveFraction = 0.3;
    else if (playstyle === 'defensive') reserveFraction = 0.6;
  }

  const initialReserves = aiPlayer.tanksInReserve;
  const reserveToHold = Math.floor(initialReserves * reserveFraction);
  let availableTanksToDeploy = initialReserves - reserveToHold;

  // Station defensive reserve tanks adjacent to owned cities to protect them (-10% penalty per defending tank)
  if (reserveToHold > 0 && ownedCityIndices.length > 0) {
    let defensiveTanksDeployed = 0;
    for (const cIdx of ownedCityIndices) {
      if (defensiveTanksDeployed >= reserveToHold) break;
      const cx = cIdx % gridSize;
      const cy = Math.floor(cIdx / gridSize);
      const neighbors = getNeighbors8(cx, cy, gridSize);
      for (const n of neighbors) {
        if (defensiveTanksDeployed >= reserveToHold) break;
        // Non-city owned land surrounding city
        if (owners[n.index] === aiId && cities[n.index] !== 1 && terrain[n.index] !== 2) {
          tanks[n.index]++;
          aiPlayer.tanksInReserve--;
          defensiveTanksDeployed++;
        }
      }
    }
  }

  // Deploy remaining available tanks to frontier tiles (non-city land)
  const nonCityFrontier = frontierTiles.filter((t) => cities[t] !== 1 && terrain[t] !== 2);
  while (availableTanksToDeploy > 0 && nonCityFrontier.length > 0) {
    const randFrontier = nonCityFrontier[Math.floor(Math.random() * nonCityFrontier.length)];
    tanks[randFrontier]++;
    aiPlayer.tanksInReserve--;
    availableTanksToDeploy--;
  }

  // 5. Gather knowledge of target cities:
  // - If Fog is OFF: AI knows ALL cities across the continent
  // - If Fog is ON: AI only knows cities it has discovered in aiExplored
  const knownUnownedCities: { x: number; y: number; index: number }[] = [];
  for (let i = 0; i < totalTiles; i++) {
    if (cities[i] === 1 && owners[i] !== aiId && terrain[i] !== 2) {
      if (isFogDisabled || aiExplored[i] === 1) {
        knownUnownedCities.push({
          x: i % gridSize,
          y: Math.floor(i / gridSize),
          index: i,
        });
      }
    }
  }

  // 6. Tactical Assault Loop
  const result: AiTurnResult = {
    attacksLaunched: 0,
    attacksWon: 0,
    citiesCaptured: [],
    supplyCutsMade: 0,
    exploredTilesCount: 0,
    desperationActivated: isDesperate,
  };

  // Re-evaluate frontier tiles with attacking tanks
  // An AI will use all available attacking tanks on the frontier
  const maxActions = 25; // Sensible ceiling per turn
  let actionsTaken = 0;

  while (actionsTaken < maxActions) {
    actionsTaken++;

    // Find all friendly non-city land tiles that currently have tanks
    const launchTiles: number[] = [];
    for (let i = 0; i < totalTiles; i++) {
      if (owners[i] === aiId && tanks[i] > 0 && cities[i] !== 1 && terrain[i] !== 2) {
        launchTiles.push(i);
      }
    }

    if (launchTiles.length === 0) break;

    // Evaluate all valid attacks across the continent
    interface ScoredAttack {
      launchIdx: number;
      targetIdx: number;
      targetX: number;
      targetY: number;
      targetOwner: PlayerId;
      isCity: boolean;
      score: number;
      oddsChance: number;
      supplyCutTiles: number;
      unexploredRevealed: number;
      isPlayerTarget: boolean;
    }

    const candidateAttacks: ScoredAttack[] = [];

    for (const lIdx of launchTiles) {
      const lx = lIdx % gridSize;
      const ly = Math.floor(lIdx / gridSize);
      const neighbors = getNeighbors8(lx, ly, gridSize);

      for (const n of neighbors) {
        const tIdx = n.index;
        // Water is impassable and cannot be attacked
        if (terrain[tIdx] === 2) continue;
        // Cannot attack own tiles
        if (owners[tIdx] === aiId) continue;

        const targetOwner = owners[tIdx] as PlayerId;
        const isTargetCity = cities[tIdx] === 1;
        const isTargetPlayer = targetOwner !== 0; // Other player factions are the real threat

        // Calculate combat odds
        const odds = calculateCombatOdds(
          n.x,
          n.y,
          aiId,
          {
            owners,
            tanks,
            cities,
            deathStates,
            terrain,
            failureCounts,
          },
          gridSize
        );

        if (odds.finalChance <= 0) continue;

        // A. Exploration score:
        // How many unexplored fog tiles will this attack reveal?
        let unexploredRevealed = 0;
        if (!isFogDisabled) {
          const targetNeighbors = getNeighbors8(n.x, n.y, gridSize);
          for (const tn of targetNeighbors) {
            if (aiExplored[tn.index] === 0) {
              unexploredRevealed++;
            }
          }
          if (aiExplored[tIdx] === 0) {
            unexploredRevealed++;
          }
        }

        // B. Supply line cut evaluation:
        // Does capturing this enemy sector cut off connection to their territory/cities?
        let supplyCutTiles = 0;
        let supplyCutTanks = 0;
        if (isTargetPlayer) {
          const cutEval = evaluateSupplyCutPotential(
            tIdx,
            targetOwner,
            { owners, tanks, cities, deathStates, terrain },
            gridSize
          );
          supplyCutTiles = cutEval.cutTiles;
          supplyCutTanks = cutEval.cutTanks;
        }

        // C. Base strategic value
        let value = 10;

        // City capture is paramount
        if (isTargetCity) {
          value += 200;
        }

        // Inverted enemy tile (100% free capture)
        if (deathStates[tIdx] > 0) {
          value += 80;
        }

        // Defending tank destroyed
        if (tanks[tIdx] > 0) {
          value += 60;
        }

        // Supply Line Severing bonus!
        // Cutting enemy lines holds them off and inverts their forces
        if (supplyCutTiles > 0) {
          value += supplyCutTiles * 35 + supplyCutTanks * 50;
        }

        // Exploration incentive (searching for cities by opening the map up)
        if (unexploredRevealed > 0) {
          value += unexploredRevealed * 18;
        }

        // Stepping toward nearest known unowned city
        if (knownUnownedCities.length > 0) {
          let minCityDist = Infinity;
          for (const c of knownUnownedCities) {
            const dist = Math.hypot(n.x - c.x, n.y - c.y);
            if (dist < minCityDist) minCityDist = dist;
          }
          // Closer is better
          value += Math.max(0, 40 - minCityDist * 4);
        }

        // D. Playstyle & Player Threat Weighting:
        // "the other players are the real threat if they encounter each other"
        if (isDesperate) {
          // Desperation override: Pure mathematical expected value!
          // Maximize odds * payoff, heavily prioritize player threats and supply cuts
          let expectedValue = (odds.finalChance / 100) * value;
          if (isTargetPlayer) expectedValue *= 1.8;
          if (supplyCutTiles > 0) expectedValue *= 1.5;
          if (isTargetCity) expectedValue *= 2.0;

          candidateAttacks.push({
            launchIdx: lIdx,
            targetIdx: tIdx,
            targetX: n.x,
            targetY: n.y,
            targetOwner,
            isCity: isTargetCity,
            score: expectedValue,
            oddsChance: odds.finalChance,
            supplyCutTiles,
            unexploredRevealed,
            isPlayerTarget: isTargetPlayer,
          });
        } else {
          // Normal Playstyles:
          // Berserk: 100% focused on other players when available, aggressive exploration
          // Balanced: ~80% attacks focused on players, 20% on neutral expansion
          // Defensive: ~50% attacks on players if found, 50% on neutral expansion
          let styleMultiplier = 1.0;

          if (playstyle === 'berserk') {
            if (isTargetPlayer) styleMultiplier = 2.5; // Hyper-aggressive against players
            if (unexploredRevealed > 0) styleMultiplier *= 1.4; // Loves opening fog
          } else if (playstyle === 'balanced') {
            if (isTargetPlayer) styleMultiplier = 1.8; // ~80% focus
            else styleMultiplier = 0.9;
          } else if (playstyle === 'defensive') {
            if (isTargetPlayer) styleMultiplier = 1.1; // ~50% focus
            else styleMultiplier = 1.2; // Safe expansion
          }

          const finalScore = (odds.finalChance / 100) * value * styleMultiplier;

          candidateAttacks.push({
            launchIdx: lIdx,
            targetIdx: tIdx,
            targetX: n.x,
            targetY: n.y,
            targetOwner,
            isCity: isTargetCity,
            score: finalScore,
            oddsChance: odds.finalChance,
            supplyCutTiles,
            unexploredRevealed,
            isPlayerTarget: isTargetPlayer,
          });
        }
      }
    }

    if (candidateAttacks.length === 0) break;

    // Pick top-scored attack (with slight stochastic variance among top 3)
    candidateAttacks.sort((a, b) => b.score - a.score);
    const topSlice = candidateAttacks.slice(0, Math.min(3, candidateAttacks.length));
    const chosen = topSlice[Math.floor(Math.random() * topSlice.length)];

    // Execute the attack
    result.attacksLaunched++;
    const roll = Math.random() * 100;

    if (roll <= chosen.oddsChance) {
      // VICTORY!
      result.attacksWon++;
      const tIdx = chosen.targetIdx;
      failureCounts.delete(tIdx);

      // Defending tank destroyed
      if (tanks[tIdx] > 0) tanks[tIdx] = 0;

      // Reveal fog around conquered tile
      aiExplored[tIdx] = 1;
      const tx = chosen.targetX;
      const ty = chosen.targetY;
      for (const fn of getNeighbors8(tx, ty, gridSize)) {
        if (aiExplored[fn.index] === 0) {
          aiExplored[fn.index] = 1;
          result.exploredTilesCount++;
        }
      }

      if (chosen.isCity) {
        result.citiesCaptured.push({ x: tx, y: ty });
        owners[tIdx] = aiId;
        deathStates[tIdx] = 0;
        tanks[tIdx] = 0; // Cities never hold tanks
        onLog?.(
          `★ ${aiPlayer.name} CAPTURED CITY at (${tx}, ${ty})!`,
          'capture',
          aiId
        );
      } else {
        owners[tIdx] = aiId;
        deathStates[tIdx] = 0;
        tanks[tIdx] = 1;
        // Launch tank advances into conquered sector
        tanks[chosen.launchIdx]--;
      }

      // Log supply cut achievement
      if (chosen.supplyCutTiles > 0) {
        result.supplyCutsMade++;
        onLog?.(
          `⚡ ${aiPlayer.name} severed enemy supply lines at (${tx}, ${ty}), cutting off ${chosen.supplyCutTiles} sector(s)!`,
          'supply',
          aiId
        );
      }
    } else {
      // FAILED
      const tIdx = chosen.targetIdx;
      const curr = failureCounts.get(tIdx) || 0;
      failureCounts.set(tIdx, curr + 1);
    }
  }

  // Update territory count & peak stats
  let finalTerritory = 0;
  let finalCities = 0;
  for (let i = 0; i < totalTiles; i++) {
    if (owners[i] === aiId) {
      finalTerritory++;
      if (cities[i] === 1) finalCities++;
    }
  }

  aiPlayer.territoryCount = finalTerritory;
  aiPlayer.citiesCount = finalCities;
  aiPlayer.peakTerritory = Math.max(aiPlayer.peakTerritory || 0, finalTerritory);
  aiPlayer.peakCities = Math.max(aiPlayer.peakCities || 0, finalCities);

  return result;
}
