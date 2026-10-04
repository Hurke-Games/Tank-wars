/**
 * Procedural Map Generator for Tank Wars
 * Generates:
 * - Empty procedural terrain map (grass, chunky pixel forests, ponds/rivers)
 * - Random placement of starting players with their 3x3 territory and 5 tanks
 * - Random neutral grey cities placed outside starting player vision
 */

import { City, GameSettings, GRID_SIZE, PlayerId, PlayerInfo, setGlobalGridSize } from '../types/game';

export interface GeneratedMap {
  gridSize: number;
  terrain: Uint8Array; // 0: plain, 1: forest, 2: water
  owners: Uint8Array;  // 0: neutral, 1: human, 2: AI 1, 3: AI 2, 4: AI 3
  tanks: Uint8Array;   // count of tanks on tile
  cities: Uint8Array;  // 1 if city exists, 0 otherwise
  cityList: City[];
  players: PlayerInfo[];
  totalCities: number;
}

export function generateTacticalMap(settings?: Partial<GameSettings>): GeneratedMap {
  const gridSize = settings?.gridSize || GRID_SIZE || 50;
  setGlobalGridSize(gridSize);

  const numAiPlayers = Math.max(1, Math.min(3, settings?.numAiPlayers !== undefined ? settings.numAiPlayers : 3));
  const activePlayersCount = 1 + numAiPlayers; // 1 Human + N AI
  const totalCitiesRequested = Math.max(activePlayersCount + 1, settings?.totalCities || 50);

  const totalTiles = gridSize * gridSize;
  const terrain = new Uint8Array(totalTiles);
  const owners = new Uint8Array(totalTiles);
  const tanks = new Uint8Array(totalTiles);
  const cities = new Uint8Array(totalTiles);
  const cityList: City[] = [];

  // 1. Generate Terrain (Plains, Forests, Ponds & Rivers)
  // Scale noise frequencies naturally with grid dimension
  const freqScale = 50 / gridSize;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;

      const f1 = Math.sin(x * 0.22 * freqScale) * Math.cos(y * 0.22 * freqScale);
      const f2 = Math.sin((x * 0.44 + y * 0.3) * freqScale) * 0.5;
      const f3 = Math.cos((x * 0.14 - y * 0.14) * freqScale) * 0.7;
      const elevation = f1 + f2 + f3;

      const forestVal = Math.sin((x * 0.3 + 1.2) * freqScale) * Math.cos((y * 0.3 - 0.8) * freqScale) + Math.sin(x * 0.6 * freqScale) * 0.3;

      // Passable edges (border margin 1 tile)
      if (elevation < -1.2 && x > 1 && x < gridSize - 2 && y > 1 && y < gridSize - 2) {
        terrain[idx] = 2; // Water / Pond
      } else if (forestVal > 0.45) {
        terrain[idx] = 1; // Forest (chunky pixel trees)
      } else {
        terrain[idx] = 0; // Plain grass
      }
    }
  }

  // Factions definition
  const allFactionRoster: PlayerInfo[] = [
    {
      id: 0,
      name: 'Neutral Towns',
      faction: 'Grey Settlements',
      color: '#94A3B8',
      darkColor: '#475569',
      accentColor: '#CBD5E1',
      isAi: true,
      tanksInReserve: 0,
      citiesCount: 0,
      territoryCount: 0,
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
      tanksInReserve: 0,
      citiesCount: 1,
      territoryCount: 9,
      isEliminated: false,
      capitalX: 0,
      capitalY: 0,
    },
    {
      id: 2,
      name: 'Red Legion',
      faction: 'Crimson Corp (AI)',
      color: '#DC2626',
      darkColor: '#B91C1C',
      accentColor: '#F87171',
      isAi: true,
      playstyle: settings?.aiPlaystyles?.[2] || 'berserk',
      peakTerritory: numAiPlayers >= 1 ? 9 : 0,
      peakCities: numAiPlayers >= 1 ? 1 : 0,
      isDesperate: false,
      tanksInReserve: 0,
      citiesCount: numAiPlayers >= 1 ? 1 : 0,
      territoryCount: numAiPlayers >= 1 ? 9 : 0,
      isEliminated: numAiPlayers < 1,
      capitalX: 0,
      capitalY: 0,
    },
    {
      id: 3,
      name: 'Green Fleet',
      faction: 'Emerald Div (AI)',
      color: '#16A34A',
      darkColor: '#15803D',
      accentColor: '#4ADE80',
      isAi: true,
      playstyle: settings?.aiPlaystyles?.[3] || 'balanced',
      peakTerritory: numAiPlayers >= 2 ? 9 : 0,
      peakCities: numAiPlayers >= 2 ? 1 : 0,
      isDesperate: false,
      tanksInReserve: 0,
      citiesCount: numAiPlayers >= 2 ? 1 : 0,
      territoryCount: numAiPlayers >= 2 ? 9 : 0,
      isEliminated: numAiPlayers < 2,
      capitalX: 0,
      capitalY: 0,
    },
    {
      id: 4,
      name: 'Gold Dominion',
      faction: 'Solar Strike (AI)',
      color: '#D97706',
      darkColor: '#B45309',
      accentColor: '#FBBF24',
      isAi: true,
      playstyle: settings?.aiPlaystyles?.[4] || 'defensive',
      peakTerritory: numAiPlayers >= 3 ? 9 : 0,
      peakCities: numAiPlayers >= 3 ? 1 : 0,
      isDesperate: false,
      tanksInReserve: 0,
      citiesCount: numAiPlayers >= 3 ? 1 : 0,
      territoryCount: numAiPlayers >= 3 ? 9 : 0,
      isEliminated: numAiPlayers < 3,
      capitalX: 0,
      capitalY: 0,
    },
  ];

  const cityNames = [
    'Oakhaven', 'Ironford', 'Sunspire', 'Silvergate', 'Frostfall',
    'Ravenhold', 'Stormwatch', 'Dawnbreak', 'Highwater', 'Pinecrest',
    'Dustmere', 'Shadowfall', 'Clearspring', 'Windmill Hill', 'Stonecross',
    'Emberpeak', 'Rivermouth', 'Ambervale', 'Greywood', 'Redcliff',
    'Boulder Junction', 'Kingswell', 'Northpoint', 'Southguard', 'Deepbrook',
    'Falconridge', 'Goldvein', 'Thornbury', 'Brightwater', 'Canyon Creek',
    'Willow Creek', 'Greenhill', 'Blackstone', 'Fox Hollow', 'Cold Spring',
    'Copper Mine', 'Mill Creek', 'Eagle Nest', 'Lone Star', 'Highland Park',
    'Cedar Point', 'Bear Mountain', 'Ashford', 'Grandview', 'Fairview',
    'Summit Ridge', 'Twin Peaks', 'Blue Basin', 'Sunset Mesa', 'Wildwood',
    'Redoubt', 'Port Sentinel', 'Eastwatch', 'Iron Ridge', 'Timber Creek',
    'Fort Horizon', 'Bluff Point', 'Silver Creek', 'Granite Peak', 'Bayview'
  ];

  let nextCityId = 1;

  // 2. Place Active Players At Random
  // Maintain minimum separation so their starting 3x3 zones do not collide
  const placedCapitals: { x: number; y: number }[] = [];
  const minPlayerSeparation = Math.max(6, Math.floor(gridSize / (activePlayersCount + 1)));

  for (let pId = 1; pId <= activePlayersCount; pId++) {
    const player = allFactionRoster[pId];

    let cx = 2;
    let cy = 2;
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 2000) {
      attempts++;
      // Keep margin of 2 so 3x3 and vision are safely inside map
      const testX = 2 + Math.floor(Math.random() * (gridSize - 4));
      const testY = 2 + Math.floor(Math.random() * (gridSize - 4));

      // Capitals CANNOT spawn on water!
      if (terrain[testY * gridSize + testX] === 2 && attempts < 1800) {
        continue;
      }

      let tooClose = false;
      for (const cap of placedCapitals) {
        const dist = Math.hypot(cap.x - testX, cap.y - testY);
        if (dist < minPlayerSeparation) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose || attempts > 1500) {
        cx = testX;
        cy = testY;
        placed = true;
      }
    }

    placedCapitals.push({ x: cx, y: cy });
    player.capitalX = cx;
    player.capitalY = cy;

    // Clear 3x3 territory around capital (ensure plain land)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const tidx = ty * gridSize + tx;
        terrain[tidx] = 0; // plain
        owners[tidx] = pId as PlayerId;
      }
    }

    // Capital City placed at (cx, cy)
    const capIdx = cy * gridSize + cx;
    cities[capIdx] = 1;
    owners[capIdx] = pId as PlayerId;
    tanks[capIdx] = 0; // City never holds a tank

    cityList.push({
      id: nextCityId++,
      x: cx,
      y: cy,
      name: `${player.name} HQ`,
      owner: pId as PlayerId,
      isCapital: true,
    });

    // 3. Place 5 tanks on surrounding 8 squares (never on city)
    const surroundingTiles: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        surroundingTiles.push((cy + dy) * gridSize + (cx + dx));
      }
    }

    // Shuffle and pick 5 distinct surrounding tiles
    for (let i = surroundingTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [surroundingTiles[i], surroundingTiles[j]] = [surroundingTiles[j], surroundingTiles[i]];
    }

    for (let i = 0; i < 5; i++) {
      tanks[surroundingTiles[i]] = 1;
    }
  }

  // 4. Determine squares starting players can see (5x5 around each capital)
  // The squares they can see may NOT have neutral cities
  const restrictedFromCities = new Uint8Array(totalTiles);
  for (const cap of placedCapitals) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const vx = cap.x + dx;
        const vy = cap.y + dy;
        if (vx >= 0 && vx < gridSize && vy >= 0 && vy < gridSize) {
          restrictedFromCities[vy * gridSize + vx] = 1;
        }
      }
    }
  }

  // 5. Place remaining Neutral Grey Cities at random
  // Allowed on edges and touching each other
  const neutralCitiesToPlace = Math.max(0, totalCitiesRequested - activePlayersCount);
  let placedNeutral = 0;
  let attempts = 0;

  while (placedNeutral < neutralCitiesToPlace && attempts < 50000) {
    attempts++;
    const rx = Math.floor(Math.random() * gridSize);
    const ry = Math.floor(Math.random() * gridSize);
    const rIdx = ry * gridSize + rx;

    // Cannot be inside starting player vision, already a city, OR on water!
    if (cities[rIdx] === 1 || restrictedFromCities[rIdx] === 1 || terrain[rIdx] === 2) {
      continue;
    }

    cities[rIdx] = 1;
    owners[rIdx] = 0; // Neutral grey

    cityList.push({
      id: nextCityId++,
      x: rx,
      y: ry,
      name: cityNames[placedNeutral % cityNames.length] || `Town ${placedNeutral + 1}`,
      owner: 0,
      isCapital: false,
    });

    placedNeutral++;
  }

  allFactionRoster[0].citiesCount = placedNeutral;

  // Recalculate territory counts
  const territoryCounts = [0, 0, 0, 0, 0];
  for (let i = 0; i < totalTiles; i++) {
    territoryCounts[owners[i]]++;
  }
  for (let p = 0; p <= 4; p++) {
    allFactionRoster[p].territoryCount = territoryCounts[p];
  }

  return {
    gridSize,
    terrain,
    owners,
    tanks,
    cities,
    cityList,
    players: allFactionRoster,
    totalCities: cityList.length,
  };
}
