/**
 * High-performance 32-bit GBA Pixel Art Canvas Renderer
 * Hand-crafted pixel sprites for terrain, tanks, cities, and UI reticles
 */

import { City, GRID_SIZE, PlayerId, PlayerInfo } from '../types/game';

// Faction palettes inspired by GBA Advance Wars
export const FACTION_PALETTES: Record<PlayerId, { primary: string; shadow: string; highlight: string; outline: string; name: string }> = {
  0: { primary: '#94A3B8', shadow: '#475569', highlight: '#E2E8F0', outline: '#1E293B', name: 'Neutral' },
  1: { primary: '#2563EB', shadow: '#1D4ED8', highlight: '#60A5FA', outline: '#0F172A', name: 'Blue Guard' },
  2: { primary: '#DC2626', shadow: '#991B1B', highlight: '#F87171', outline: '#0F172A', name: 'Red Legion' },
  3: { primary: '#16A34A', shadow: '#15803D', highlight: '#4ADE80', outline: '#0F172A', name: 'Green Fleet' },
  4: { primary: '#D97706', shadow: '#B45309', highlight: '#FCD34D', outline: '#0F172A', name: 'Gold Dominion' },
};

export interface RenderState {
  gridSize?: number;
  terrain: Uint8Array;
  owners: Uint8Array;
  tanks: Uint8Array;
  cities: Uint8Array;
  deathStates: Uint8Array;
  exhaustedTanks?: Uint8Array; // 1 if tank attacked/moved this turn and cannot move
  visibleTiles: Uint8Array; // 1: currently visible
  exploredTiles: Uint8Array; // 1: visited at least once
  cameraX: number;
  cameraY: number;
  zoom: number; // tileSize in pixels (e.g. 16, 24, 32)
  selectedTile: { x: number; y: number } | null;
  hoveredTile: { x: number; y: number } | null;
  hoverOdds?: { x: number; y: number; chanceText: string; chanceNum: number } | null;
  attackTarget: { x: number; y: number } | null;
  animationTick: number;
  showAllFog?: boolean; // debug god mode
}

export class PixelRenderer {
  // Pre-rendered offscreen caches for sprites to guarantee 60fps
  private tankSprites: Map<PlayerId, HTMLCanvasElement> = new Map();
  private citySprites: Map<PlayerId, HTMLCanvasElement> = new Map();
  private treeSprite: HTMLCanvasElement | null = null;

  constructor() {
    this.initSpriteCaches();
  }

  private initSpriteCaches() {
    // Generate crisp 24x24 pixel sprites for each player's tank and city
    for (let p = 0; p <= 4; p++) {
      const pId = p as PlayerId;
      this.tankSprites.set(pId, this.createTankSprite(pId));
      this.citySprites.set(pId, this.createCitySprite(pId));
    }
    this.treeSprite = this.createTreeSprite();
  }

  // Draw 32-bit Advance Wars GBA Tank Sprite
  private createTankSprite(pId: PlayerId): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const pal = FACTION_PALETTES[pId];

    // Caterpillar Treads (Black outline + dark rubber)
    ctx.fillStyle = '#111827';
    ctx.fillRect(2, 4, 4, 16);
    ctx.fillRect(18, 4, 4, 16);

    ctx.fillStyle = '#374151';
    ctx.fillRect(3, 5, 2, 14);
    ctx.fillRect(19, 5, 2, 14);

    // Tread segment lines
    ctx.fillStyle = '#1F2937';
    for (let y = 6; y <= 16; y += 3) {
      ctx.fillRect(2, y, 4, 1);
      ctx.fillRect(18, y, 4, 1);
    }

    // Hull Outline
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(5, 5, 14, 14);

    // Hull Base Shadow
    ctx.fillStyle = pal.shadow;
    ctx.fillRect(6, 6, 12, 12);

    // Hull Primary
    ctx.fillStyle = pal.primary;
    ctx.fillRect(6, 6, 12, 9);

    // Hull Highlight bevel
    ctx.fillStyle = pal.highlight;
    ctx.fillRect(7, 6, 10, 2);

    // Turret Base
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(8, 7, 8, 8);

    ctx.fillStyle = pal.primary;
    ctx.fillRect(9, 8, 6, 6);

    ctx.fillStyle = pal.highlight;
    ctx.fillRect(10, 8, 4, 2);

    // Cannon Barrel
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(10, 1, 4, 8);

    ctx.fillStyle = '#4B5563';
    ctx.fillRect(11, 2, 2, 6);

    // Muzzle brake
    ctx.fillStyle = '#111827';
    ctx.fillRect(10, 1, 4, 2);

    // Hatch hatch circle
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(11, 10, 2, 2);

    return canvas;
  }

  // Draw 32-bit GBA City Sprite (Fortress/Headquarters with Antenna and Faction Banner)
  private createCitySprite(pId: PlayerId): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const pal = FACTION_PALETTES[pId];

    // Building footprint shadow
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(3, 3, 18, 19);

    // Stone wall base
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 5, 16, 16);

    // Front facade highlight
    ctx.fillStyle = '#64748B';
    ctx.fillRect(5, 6, 14, 14);

    // Roof parapets
    ctx.fillStyle = pal.shadow;
    ctx.fillRect(4, 4, 16, 4);

    ctx.fillStyle = pal.primary;
    ctx.fillRect(5, 4, 14, 2);

    // Lit windows (GBA yellow / warm glass)
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(7, 10, 3, 3);
    ctx.fillRect(14, 10, 3, 3);
    ctx.fillRect(7, 15, 3, 3);
    ctx.fillRect(14, 15, 3, 3);

    // Window frames
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(6, 11, 1, 2);
    ctx.fillRect(13, 11, 1, 2);

    // Reinforced Steel Door
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(11, 16, 2, 4);

    // Radio Antenna tower
    ctx.fillStyle = '#334155';
    ctx.fillRect(11, 1, 2, 4);
    ctx.fillStyle = '#EF4444'; // blinking beacon
    ctx.fillRect(11, 0, 2, 1);

    // Faction Flag / Banner on roof
    ctx.fillStyle = pal.primary;
    ctx.fillRect(15, 1, 5, 3);
    ctx.fillStyle = pal.highlight;
    ctx.fillRect(15, 1, 3, 1);

    return canvas;
  }

  // Draw chunky pixel tree cluster
  private createTreeSprite(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Trunk
    ctx.fillStyle = '#451A03';
    ctx.fillRect(10, 14, 4, 6);

    // Canopy Outline
    ctx.fillStyle = '#064E3B';
    ctx.beginPath();
    ctx.arc(12, 11, 9, 0, Math.PI * 2);
    ctx.fill();

    // Canopy Dark Green
    ctx.fillStyle = '#047857';
    ctx.beginPath();
    ctx.arc(12, 11, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Canopy Mid Green
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(11, 9.5, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Chunky pixel highlight
    ctx.fillStyle = '#6EE7B7';
    ctx.fillRect(8, 7, 4, 3);
    ctx.fillRect(13, 8, 3, 2);

    return canvas;
  }

  /**
   * Main render loop
   */
  public render(canvas: HTMLCanvasElement, state: RenderState) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const width = canvas.width;
    const height = canvas.height;
    const zoom = state.zoom;
    const currentGridSize = state.gridSize || GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Compute tile viewport
    const startTileX = Math.max(0, Math.floor(state.cameraX / zoom));
    const startTileY = Math.max(0, Math.floor(state.cameraY / zoom));
    const endTileX = Math.min(currentGridSize - 1, Math.ceil((state.cameraX + width) / zoom));
    const endTileY = Math.min(currentGridSize - 1, Math.ceil((state.cameraY + height) / zoom));

    const animFlash = (Math.floor(state.animationTick / 15) % 2) === 0;

    // 1. Render Terrain Tiles
    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const idx = ty * currentGridSize + tx;
        const screenX = Math.floor(tx * zoom - state.cameraX);
        const screenY = Math.floor(ty * zoom - state.cameraY);

        const isVisible = state.showAllFog || state.visibleTiles[idx] === 1;
        const isExplored = state.showAllFog || state.exploredTiles[idx] === 1;

        if (!isExplored) {
          // Shrouded in deep fog
          ctx.fillStyle = '#0B0F19';
          ctx.fillRect(screenX, screenY, zoom, zoom);
          continue;
        }

        const terrainType = state.terrain[idx];
        const owner = state.owners[idx] as PlayerId;

        // Base terrain fill
        if (terrainType === 2) {
          // Water / Pond
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(screenX, screenY, zoom, zoom);
          // Wave pixel shimmer
          if (zoom >= 16) {
            ctx.fillStyle = '#60A5FA';
            ctx.fillRect(screenX + 3, screenY + 4, Math.max(2, zoom - 6), 1);
            ctx.fillRect(screenX + 5, screenY + Math.floor(zoom * 0.6), Math.max(2, zoom - 10), 1);
          }
        } else if (terrainType === 1) {
          // Forest
          ctx.fillStyle = '#2E7D32';
          ctx.fillRect(screenX, screenY, zoom, zoom);
        } else {
          // Plain grass
          // Checkerboard subtle dither
          const checker = (tx + ty) % 2 === 0;
          ctx.fillStyle = checker ? '#4CAF50' : '#43A047';
          ctx.fillRect(screenX, screenY, zoom, zoom);

          // Subtle grass blade dots
          if (zoom >= 20 && (tx * 13 + ty * 7) % 5 === 0) {
            ctx.fillStyle = '#81C784';
            ctx.fillRect(screenX + 4, screenY + 6, 2, 2);
          }
        }

        // Territory ownership overlay (never on impassable water)
        if (owner !== 0 && terrainType !== 2) {
          const pal = FACTION_PALETTES[owner];
          ctx.fillStyle = pal.primary;
          ctx.globalAlpha = 0.28;
          ctx.fillRect(screenX, screenY, zoom, zoom);
          ctx.globalAlpha = 1.0;

          // Border highlight for owned land
          if (zoom >= 14) {
            ctx.fillStyle = pal.highlight;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(screenX, screenY, zoom, 1);
            ctx.fillRect(screenX, screenY, 1, zoom);
            ctx.globalAlpha = 1.0;
          }
        }

        // Forest canopy sprite
        if (terrainType === 1 && this.treeSprite) {
          ctx.drawImage(this.treeSprite, screenX, screenY, zoom, zoom);
        }

        // Inverted Disconnected State (Neutral grey included, but never water):
        const deathState = state.deathStates[idx];
        if (deathState > 0 && terrainType !== 2) {
          ctx.save();
          // Mathematically invert all color channels in this sector
          ctx.globalCompositeOperation = 'difference';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(screenX, screenY, zoom, zoom);
          ctx.restore();

          // High-contrast negative border
          ctx.save();
          ctx.strokeStyle = animFlash ? '#FFFFFF' : '#000000';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, zoom - 1, zoom - 1);

          // Diagonal negative hash line
          if (zoom >= 16) {
            ctx.strokeStyle = animFlash ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY + zoom);
            ctx.lineTo(screenX + zoom, screenY);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Dim if explored but currently out of vision (fog of war)
        if (!isVisible) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
          ctx.fillRect(screenX, screenY, zoom, zoom);
        }
      }
    }

    // 2. Render Cities (Buildings & Faction Flags)
    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const idx = ty * currentGridSize + tx;
        if (state.cities[idx] !== 1) continue;

        const isVisible = state.showAllFog || state.visibleTiles[idx] === 1;
        const isExplored = state.showAllFog || state.exploredTiles[idx] === 1;
        if (!isExplored) continue;

        const screenX = Math.floor(tx * zoom - state.cameraX);
        const screenY = Math.floor(ty * zoom - state.cameraY);
        const owner = state.owners[idx] as PlayerId;

        const citySprite = this.citySprites.get(owner) || this.citySprites.get(0)!;
        ctx.drawImage(citySprite, screenX, screenY, zoom, zoom);

        // City badge / Capital star
        if (zoom >= 18) {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(screenX + zoom - 6, screenY + 1, 5, 5);
          ctx.fillStyle = '#FEF08A';
          ctx.fillRect(screenX + zoom - 5, screenY + 2, 3, 3);
        }

        if (!isVisible) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
          ctx.fillRect(screenX, screenY, zoom, zoom);
        }
      }
    }

    // 3. Render Tanks (Only on currently visible tiles!)
    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const idx = ty * currentGridSize + tx;
        const tankCount = state.tanks[idx];
        if (tankCount === 0) continue;

        const isVisible = state.showAllFog || state.visibleTiles[idx] === 1;
        if (!isVisible) continue;

        const screenX = Math.floor(tx * zoom - state.cameraX);
        const screenY = Math.floor(ty * zoom - state.cameraY);
        const owner = state.owners[idx] as PlayerId;

        const tankSprite = this.tankSprites.get(owner) || this.tankSprites.get(1)!;
        const isInverted = state.deathStates[idx] > 0;

        // Subtle idle tread vibration
        const bob = Math.sin((state.animationTick + tx * 3 + ty * 7) * 0.1) * 0.8;

        ctx.save();
        if (isInverted) {
          ctx.filter = 'invert(100%)';
        }
        ctx.drawImage(tankSprite, screenX, screenY + bob, zoom, zoom);
        ctx.restore();

        // Multiple tanks indicator badge
        if (tankCount > 1 && zoom >= 16) {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(screenX + 1, screenY + zoom - 8, 8, 7);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(`x${tankCount}`, screenX + 2, screenY + zoom - 2);
        }

        // If tank is in death state / inverted, draw warning indicator
        if (isInverted) {
          ctx.fillStyle = animFlash ? '#EF4444' : '#FFFFFF';
          ctx.fillRect(screenX + zoom - 7, screenY + 2, 5, 5);
          ctx.fillStyle = '#000000';
          ctx.fillRect(screenX + zoom - 6, screenY + 3, 3, 3);
        }
      }
    }

    // 4. Render Grid Lines (Crisp GBA grid at medium/high zoom)
    if (zoom >= 18) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let tx = startTileX; tx <= endTileX + 1; tx++) {
        const sx = Math.floor(tx * zoom - state.cameraX);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let ty = startTileY; ty <= endTileY + 1; ty++) {
        const sy = Math.floor(ty * zoom - state.cameraY);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
    }

    // 5. Render Selection and Target Reticles (Advance Wars Style Corner Brackets)
    if (state.selectedTile) {
      const selX = Math.floor(state.selectedTile.x * zoom - state.cameraX);
      const selY = Math.floor(state.selectedTile.y * zoom - state.cameraY);

      if (selX > -zoom && selX < width && selY > -zoom && selY < height) {
        this.drawAdvanceWarsBracket(ctx, selX, selY, zoom, '#38BDF8', state.animationTick);
      }
    }

    // Hovered tile cursor
    if (state.hoveredTile && (!state.selectedTile || state.hoveredTile.x !== state.selectedTile.x || state.hoveredTile.y !== state.selectedTile.y)) {
      const hovX = Math.floor(state.hoveredTile.x * zoom - state.cameraX);
      const hovY = Math.floor(state.hoveredTile.y * zoom - state.cameraY);

      if (hovX > -zoom && hovX < width && hovY > -zoom && hovY < height) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hovX + 1, hovY + 1, zoom - 2, zoom - 2);
      }
    }

    // Attack Target reticle (Flashing red crosshair)
    if (state.attackTarget) {
      const attX = Math.floor(state.attackTarget.x * zoom - state.cameraX);
      const attY = Math.floor(state.attackTarget.y * zoom - state.cameraY);

      if (attX > -zoom && attX < width && attY > -zoom && attY < height) {
        this.drawAdvanceWarsBracket(ctx, attX, attY, zoom, '#EF4444', state.animationTick + 8);

        // Crosshairs
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(attX + zoom * 0.5, attY + 2);
        ctx.lineTo(attX + zoom * 0.5, attY + zoom - 2);
        ctx.moveTo(attX + 2, attY + zoom * 0.5);
        ctx.lineTo(attX + zoom - 2, attY + zoom * 0.5);
        ctx.stroke();
      }
    }

    // 6. Hover Attack Odds Badge (Prominent GBA Tactical Display)
    if (state.hoverOdds) {
      const hx = Math.floor(state.hoverOdds.x * zoom - state.cameraX);
      const hy = Math.floor(state.hoverOdds.y * zoom - state.cameraY);

      if (hx > -200 && hx < width + 200 && hy > -100 && hy < height + 100) {
        ctx.save();
        const text = `Chance of success ${state.hoverOdds.chanceText}`;
        ctx.font = "bold 9px 'Press Start 2P', monospace, sans-serif";
        const textMetrics = ctx.measureText(text);
        const badgeW = Math.max(textMetrics.width + 16, 120);
        const badgeH = 22;

        // Position above the tile, or below if near top
        let badgeX = hx + (zoom - badgeW) / 2;
        let badgeY = hy - badgeH - 6;
        if (badgeY < 8) {
          badgeY = hy + zoom + 6;
        }

        // Clamp to screen boundaries
        badgeX = Math.max(4, Math.min(width - badgeW - 4, badgeX));

        // Color coding
        let badgeBg = '#052E16'; // emerald
        let badgeBorder = '#10B981';
        let textColor = '#6EE7B7';

        if (state.hoverOdds.chanceNum < 50) {
          badgeBg = '#450A0A'; // red
          badgeBorder = '#EF4444';
          textColor = '#FCA5A5';
        } else if (state.hoverOdds.chanceNum < 75) {
          badgeBg = '#451A03'; // amber
          badgeBorder = '#F59E0B';
          textColor = '#FDE68A';
        }

        // Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(badgeX + 2, badgeY + 2, badgeW, badgeH);

        // Badge body
        ctx.fillStyle = badgeBg;
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

        // Crisp border
        ctx.strokeStyle = badgeBorder;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        // Text
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);

        ctx.restore();
      }
    }
  }

  // Draw authentic Advance Wars 4-corner animated cursor brackets
  private drawAdvanceWarsBracket(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    tick: number
  ) {
    const pulse = Math.sin(tick * 0.15) * 1.5;
    const corner = Math.max(3, Math.floor(size * 0.28));
    const pad = Math.floor(pulse);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x - pad, y - pad + corner);
    ctx.lineTo(x - pad, y - pad);
    ctx.lineTo(x - pad + corner, y - pad);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + size + pad - corner, y - pad);
    ctx.lineTo(x + size + pad, y - pad);
    ctx.lineTo(x + size + pad, y - pad + corner);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x - pad, y + size + pad - corner);
    ctx.lineTo(x - pad, y + size + pad);
    ctx.lineTo(x - pad + corner, y + size + pad);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + size + pad - corner, y + size + pad);
    ctx.lineTo(x + size + pad, y + size + pad);
    ctx.lineTo(x + size + pad, y + size + pad - corner);
    ctx.stroke();

    ctx.restore();
  }
}
